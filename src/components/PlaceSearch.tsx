import {
  useId,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from "react";
import { MAX_SEARCH_LENGTH, type Place } from "../data/geocode";
import { visiblePlaces, type SuggestionsState } from "../hooks/usePlaceSuggestions";
import { useI18n } from "../i18n/context";

interface Props {
  /** The text in the field. */
  text: string;
  onTextChange: (text: string) => void;
  suggestions: SuggestionsState;
  onChoose: (place: Place) => void;
  /** Enter with nothing highlighted: choose the top suggestion, once it is there. */
  onChooseTop: () => void;
  inputRef?: Ref<HTMLInputElement>;
  /** Shown next to the field, on the same row: the "Use my location" button. */
  children?: ReactNode;
}

/**
 * Address/place search following the ARIA combobox pattern (list autocomplete). Choosing a
 * suggestion starts the pharmacy search. Enter with no suggestion highlighted takes the top
 * one, waiting for it if the answer is still on its way. There's no separate search button.
 */
export function PlaceSearch({
  text,
  onTextChange,
  suggestions,
  onChoose,
  onChooseTop,
  inputRef,
  children,
}: Props) {
  const { t } = useI18n();
  const inputId = useId();
  const listId = useId();
  const hintId = useId();
  const [activeIndex, setActiveIndex] = useState(-1);
  // Closed with Escape or by choosing; typing opens it again.
  const [dismissed, setDismissed] = useState(false);
  // The list only shows while the field has focus, so a late answer can't pop it open elsewhere.
  const [focused, setFocused] = useState(false);

  const places = visiblePlaces(suggestions);
  const open = focused && !dismissed && places.length > 0;
  const active = open && activeIndex < places.length ? activeIndex : -1;

  const close = () => {
    setDismissed(true);
    setActiveIndex(-1);
  };

  const choose = (place: Place) => {
    close();
    onChoose(place);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp": {
        if (places.length === 0) return;
        event.preventDefault();
        const down = event.key === "ArrowDown";
        setDismissed(false);
        if (!open || active === -1) {
          setActiveIndex(down ? 0 : places.length - 1);
        } else {
          setActiveIndex((active + (down ? 1 : places.length - 1)) % places.length);
        }
        return;
      }
      case "Escape":
        if (open) close();
        else if (text) {
          onTextChange("");
        }
        return;
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (active >= 0) choose(places[active]!);
    else onChooseTop();
  };

  return (
    <form role="search" onSubmit={onSubmit} className="mt-4">
      <label htmlFor={inputId} className="block font-semibold">
        {t("search.label")}
      </label>
      <div className="mt-1 flex flex-wrap gap-2">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          aria-describedby={hintId}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          maxLength={MAX_SEARCH_LENGTH}
          value={text}
          onChange={(event) => {
            onTextChange(event.target.value);
            setDismissed(false);
            setActiveIndex(-1);
          }}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            setActiveIndex(-1);
          }}
          className="min-h-11 min-w-0 flex-1 basis-56 rounded border border-slate-500 px-3 py-2 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        />
        {children}
      </div>
      <ul
        id={listId}
        role="listbox"
        aria-label={t("search.label")}
        hidden={!open}
        className="mt-1 divide-y divide-slate-200 rounded border border-slate-500 bg-white"
      >
        {places.map((place, index) => (
          <li
            key={`${place.label}-${place.lat}-${place.lon}`}
            id={`${listId}-${index}`}
            role="option"
            aria-selected={index === active}
            // Keep focus in the field, so the list doesn't close before the click lands.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => choose(place)}
            className={`flex min-h-11 cursor-pointer items-center px-3 py-2 hover:bg-slate-100 ${
              index === active ? "bg-blue-50 outline-3 -outline-offset-3 outline-blue-700" : ""
            }`}
          >
            {place.label}
          </li>
        ))}
      </ul>
      <p id={hintId} className="mt-2 text-sm text-slate-700">
        {t("search.hint")} {t("search.privacy")}
      </p>
    </form>
  );
}
