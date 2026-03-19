import { describe, expect, it } from "vitest";
import { runWithConcurrency } from "./runWithConcurrency.js";

describe("runWithConcurrency", () => {
    it("returns results in input order", async () => {
        const items = [1, 2, 3, 4];
        const results = await runWithConcurrency(items, 2, async (item) => {
            await new Promise((resolve) => setTimeout(resolve, 5 * (5 - item)));
            return `value-${item}`;
        });

        expect(results).toEqual(["value-1", "value-2", "value-3", "value-4"]);
    });

    it("does not exceed the provided concurrency", async () => {
        const items = [1, 2, 3, 4, 5, 6];
        let inFlight = 0;
        let maxInFlight = 0;

        await runWithConcurrency(items, 2, async () => {
            inFlight += 1;
            maxInFlight = Math.max(maxInFlight, inFlight);
            await new Promise((resolve) => setTimeout(resolve, 15));
            inFlight -= 1;
            return true;
        });

        expect(maxInFlight).toBeLessThanOrEqual(2);
    });

    it("rejects when one of the mapped promises rejects", async () => {
        await expect(
            runWithConcurrency([1, 2, 3], 2, async (item) => {
                if (item === 2) {
                    throw new Error("boom");
                }
                return item;
            })
        ).rejects.toThrow("boom");
    });
});
