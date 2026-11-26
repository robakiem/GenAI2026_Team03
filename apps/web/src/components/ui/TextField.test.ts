import { describe, expect, it } from "vitest";
import { fieldInputClass } from "./TextField";

const classes = (value: string) => value.split(/\s+/);

// The share inputs of the expense form sit next to the member's name. With both `w-24` and the
// default `w-full` on one element, Tailwind's own order decides and `w-full` wins: at 360 px the
// input covered the names, so nobody could see whose amount or percentage they were typing.
describe("fieldInputClass", () => {
  it("a full-width field keeps its width and padding", () => {
    expect(classes(fieldInputClass(undefined))).toEqual(expect.arrayContaining(["w-full", "px-4", "py-2.5"]));
  });

  it("a compact share field has one width and one padding, never w-full", () => {
    const list = classes(fieldInputClass(undefined, "compact"));
    expect(list).toEqual(expect.arrayContaining(["w-24", "px-2.5", "py-1.5"]));
    expect(list.filter((name) => /^w-/.test(name))).toEqual(["w-24"]);
    expect(list.filter((name) => /^px-/.test(name))).toEqual(["px-2.5"]);
    expect(list.filter((name) => /^py-/.test(name))).toEqual(["py-1.5"]);
  });

  it("an error changes the border, not the size", () => {
    const list = classes(fieldInputClass("x", "compact"));
    expect(list).toContain("border-danger/60");
    expect(list.filter((name) => /^w-/.test(name))).toEqual(["w-24"]);
  });
});
