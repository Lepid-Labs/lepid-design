// Keeps a floating layer usable while a modal <dialog> is open (imports nothing,
// so plain pages can use it too). A modal sits in the browser's top layer and
// makes the rest of the page inert, so a layer outside it would be hidden under
// it or out of reach. This moves `box` into the topmost open modal, where
// inertness stops, and back after `home` when none is open; `moved` runs after
// each move (re-show a popover there: leaving the document hid it).

/** Start following; returns the stop function, which also puts `box` back home. */
export function followTopModal(box: HTMLElement, home: Element, moved: () => void): () => void {
  const follow = () => {
    const modal = [...document.querySelectorAll("dialog:modal")].at(-1);
    if (box.parentNode === (modal ?? home.parentNode)) return;
    if (modal) modal.append(box);
    else home.after(box);
    moved();
  };
  const watch = new MutationObserver(follow);
  watch.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["open"] });
  follow();
  return () => {
    watch.disconnect();
    home.after(box);
  };
}
