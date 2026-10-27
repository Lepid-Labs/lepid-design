// No-build demo of inline editing and star ratings. It drives plain markup with the
// same pure helpers the React components use (built into ui/ by the Pages workflow;
// locally, symlink site/ui to components/react/dist after a build). The accordions
// are plain HTML and need no script.
import { fakeRequest, inlineEditor } from "./inline-edit-demo.js";
import { formatRating, ratingLabel, starFills } from "./ui/rating.js";

const $ = (id) => document.getElementById(id);

// Inline editing: the save waits 700 ms; the checkbox makes the next one fail
const failNext = () => {
  if (!$("edit-fail").checked) return "";
  $("edit-fail").checked = false;
  return "The server didn't answer. Your change is still here; press Enter to try again.";
};
inlineEditor($("edit-title"), {
  label: "Project name",
  value: "Deploy pipeline",
  save: fakeRequest(700, failNext),
  validate: (v) => (v.trim() ? undefined : "A project needs a name."),
});
inlineEditor($("edit-notes"), {
  label: "Description",
  value: "Builds on every push to main.\nPromotes to production after the smoke tests pass.",
  placeholder: "Add a description",
  multiline: true,
  save: fakeRequest(700, failNext),
});

// Star rating input: native radios do the keyboard and fill; this paints the text
const rate = $("rate");
const options = rate.querySelector(".ld-rating__options");
for (let n = 1; n <= 5; n++) {
  options.insertAdjacentHTML("beforeend", `<label class="ld-rating__option"><input type="radio" class="ld-rating__input"
    name="rate" value="${n}" aria-label="${n} ${n === 1 ? "star" : "stars"}"><span class="ld-rating__glyph" aria-hidden="true"></span></label>`);
}
const clear = rate.querySelector(".ld-rating__clear");
const paintRate = () => {
  const value = Number(rate.querySelector(":checked")?.value ?? 0);
  rate.querySelector(".ld-rating__value").textContent = value ? `${value} of 5` : "Not rated";
  clear.style.display = value ? "" : "none"; // .ld-btn sets display, so [hidden] would not hide it
};
rate.addEventListener("change", paintRate);
clear.addEventListener("click", () => {
  rate.querySelector(":checked").checked = false;
  paintRate();
  options.querySelector("input").focus(); // the button is about to go
});
paintRate();

// Read-only ratings: fill each star to the rounded average, print it and the count
for (const el of $("ratings").children) {
  const value = Number(el.dataset.value);
  const count = Number(el.dataset.count);
  el.setAttribute("role", "img");
  el.setAttribute("aria-label", ratingLabel(value, 5, count));
  const stars = starFills(count ? value : 0).map((f) => `<span class="ld-rating__glyph" style="--ld-fill:${f}"></span>`).join("");
  el.innerHTML = `<span class="ld-rating__stars">${stars}</span><span class="ld-rating__value">${count ? formatRating(value) : "No ratings"}</span>${
    count ? `<span class="ld-rating__count">(${count.toLocaleString()})</span>` : ""}`;
}
