import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { validateEnvironment } from "../Server/Config";

describe("validateEnvironment", () => {
  let originalEnv: NodeJS.ProcessEnv;
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    originalEnv = { ...process.env };
    exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("skips validation when DEBUG is TRUE", () => {
    process.env.DEBUG = "TRUE";
    validateEnvironment();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("exits with code 1 when required vars are missing", () => {
    delete process.env.DEBUG;
    // Clear all required vars
    delete process.env.TWITCH_CLIENT_ID;
    delete process.env.TWITCH_CLIENT_SECRET;
    delete process.env.DISCORD_TOKEN;

    validateEnvironment();

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("lists all missing variables in error output", () => {
    delete process.env.DEBUG;
    delete process.env.TWITCH_CLIENT_ID;
    delete process.env.DISCORD_TOKEN;

    validateEnvironment();

    const errorOutput = errorSpy.mock.calls.map((c: unknown[]) => c[0]).join("\n");
    expect(errorOutput).toContain("TWITCH_CLIENT_ID");
    expect(errorOutput).toContain("DISCORD_TOKEN");
  });

  it("does not exit when all required vars are present", () => {
    delete process.env.DEBUG;
    process.env.TWITCH_CLIENT_ID = "test";
    process.env.TWITCH_CLIENT_SECRET = "test";
    process.env.TWITCH_REDIRECT_URI = "test";
    process.env.SPOTIFY_CLIENT_ID = "test";
    process.env.SPOTIFY_CLIENT_SECRET = "test";
    process.env.SPOTIFY_REDIRECT_URI = "test";
    process.env.YOUTUBE_CLIENT_ID = "test";
    process.env.YOUTUBE_CLIENT_SECRET = "test";
    process.env.YOUTUBE_REDIRECT_URI = "test";
    process.env.DISCORD_TOKEN = "test";
    process.env.STREAMERBROWSER = "test";
    process.env.BOTBROWSER = "test";

    validateEnvironment();

    expect(exitSpy).not.toHaveBeenCalled();
  });
});
