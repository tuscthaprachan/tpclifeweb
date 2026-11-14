import { describe, expect, it } from "vitest";
import { activeFilters, listHref, listParams, nextSort, parseListQuery, sanitiseBack, withoutFilter } from "@/lib/admin/content/list-query";

describe("parseListQuery", () => {
  it("defaults to newest edits first on page 1", () => {
    expect(parseListQuery({})).toMatchObject({ sort: "updated", dir: "desc", page: 1, q: undefined, status: undefined });
  });

  it("reads sort, direction and filters", () => {
    const query = parseListQuery({ sort: "title", dir: "desc", q: " budget ", status: "draft", within: "7d", by: "u1", facet: "welfare", page: "3" }, { facetValues: ["welfare"] });
    expect(query).toMatchObject({ sort: "title", dir: "desc", q: "budget", status: "draft", within: "7d", by: "u1", facet: "welfare", page: 3 });
  });

  it("falls back for a sort the type does not offer, a bad direction and an unknown facet", () => {
    const query = parseListQuery({ sort: "date", dir: "sideways", facet: "nope", within: "1y", page: "-4" }, { sortable: ["title", "updated"], facetValues: ["welfare"] });
    expect(query).toMatchObject({ sort: "updated", dir: "desc", facet: undefined, within: undefined, page: 1 });
  });

  it("uses a column's natural direction when only the sort is given", () => {
    expect(parseListQuery({ sort: "title" }).dir).toBe("asc");
    expect(parseListQuery({ sort: "date" }).dir).toBe("desc");
  });

  it("ignores status for a type without one", () => {
    expect(parseListQuery({ status: "draft" }, { hasStatus: false }).status).toBeUndefined();
  });
});

describe("links", () => {
  const query = parseListQuery({ q: "a b", status: "published", sort: "title", dir: "asc", page: "2" });

  it("toggles direction on the current column and uses the natural direction on another", () => {
    expect(nextSort(query, "title")).toEqual({ sort: "title", dir: "desc" });
    expect(nextSort(query, "updated")).toEqual({ sort: "updated", dir: "desc" });
    expect(nextSort(query, "status")).toEqual({ sort: "status", dir: "asc" });
  });

  it("builds hrefs that keep the filters and reset the page", () => {
    expect(listHref("/admin/content/news", query, { sort: "updated", dir: "desc" })).toBe("/admin/content/news?q=a+b&status=published");
    expect(listHref("/admin/content/news", query, { page: 3 })).toBe("/admin/content/news?q=a+b&status=published&sort=title&dir=asc&page=3");
    expect(listHref("/admin/content/news", parseListQuery({}))).toBe("/admin/content/news");
  });

  it("removes one filter and keeps the sort", () => {
    const full = parseListQuery({ q: "x", within: "30d", sort: "status" });
    expect(activeFilters(full)).toEqual(["q", "within"]);
    expect(listParams(withoutFilter(full, "q"))).toBe("within=30d&sort=status&dir=asc");
  });

  it("keeps only known parameters when going back to the list", () => {
    expect(sanitiseBack("?q=x&evil=1&sort=title&dir=asc")).toBe("q=x&sort=title&dir=asc");
    expect(sanitiseBack(null)).toBe("");
  });
});
