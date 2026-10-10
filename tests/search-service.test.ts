import { expect, test } from "bun:test";
import { parseQuery, SearchService } from "../src/application/search-service";
import { InMemoryTaskRepository } from "./fakes";

test("parseQuery splits date tokens from words", () => {
  expect(parseQuery(" 2026-10 Login  2025 bug ")).toEqual({
    dates: ["2026-10", "2025"],
    terms: ["login", "bug"],
  });
});

test("search filters by date prefix and all terms, newest first", async () => {
  const repo = new InMemoryTaskRepository();
  const t = (day: string, time: string, text: string) => ({
    id: day + time,
    day,
    time,
    text,
    done: false,
  });
  await repo.writeDay("2025-10-01", [
    t("2025-10-01", "09:00", "Fix login bug"),
  ]);
  await repo.writeDay("2026-10-01", [
    t("2026-10-01", "09:00", "Fix login bug"),
    t("2026-10-01", "10:00", "login page copy"),
  ]);
  await repo.writeDay("2026-10-05", [
    t("2026-10-05", "09:00", "Login bug again"),
  ]);
  const search = new SearchService(repo);

  expect((await search.search("login bug")).map((x) => x.day)).toEqual([
    "2026-10-05",
    "2026-10-01",
    "2025-10-01",
  ]);
  expect((await search.search("2026-10 login")).map((x) => x.text)).toEqual([
    "Login bug again",
    "login page copy",
    "Fix login bug",
  ]);
  expect(await search.search("2024")).toEqual([]);
  expect(await search.search("  ")).toEqual([]);
});
