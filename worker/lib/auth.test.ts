import { describe, expect, test } from "vite-plus/test";
import { __resetJwksCacheForTests, verifyAccessJwt } from "./auth";

describe("verifyAccessJwt", () => {
  test("rejects empty token", async () => {
    await expect(verifyAccessJwt("", { ACCESS_TEAM_DOMAIN: "x", ACCESS_AUD: "y" })).rejects.toThrow(
      /Missing Access JWT/,
    );
  });

  test("rejects when team domain missing", async () => {
    await expect(
      verifyAccessJwt("abc.def.ghi", { ACCESS_TEAM_DOMAIN: "", ACCESS_AUD: "y" }),
    ).rejects.toThrow(/ACCESS_TEAM_DOMAIN/);
  });

  test("rejects when audience missing", async () => {
    __resetJwksCacheForTests();
    await expect(
      verifyAccessJwt("abc.def.ghi", { ACCESS_TEAM_DOMAIN: "x", ACCESS_AUD: "" }),
    ).rejects.toThrow(/ACCESS_AUD/);
  });
});
