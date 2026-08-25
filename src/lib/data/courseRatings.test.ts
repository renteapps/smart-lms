import { describe, expect, it } from "vitest";
import {
  mapCourseRatingSummaries,
  mapLessonRatingSummaries,
} from "./courseRatings";

describe("course rating summaries", () => {
  it("converts PostgREST numeric values and preserves the evaluation count", () => {
    expect(
      mapCourseRatingSummaries([
        { course_id: "course-1", average_rating: "4.67", ratings_count: 12 },
      ]),
    ).toEqual({
      "course-1": { averageRating: 4.67, ratingsCount: 12 },
    });
  });

  it("represents unrated lessons without inventing a zero-star score", () => {
    expect(
      mapLessonRatingSummaries([
        { lesson_id: "lesson-1", average_rating: null, ratings_count: 0 },
      ]),
    ).toEqual({
      "lesson-1": { averageRating: null, ratingsCount: 0 },
    });
  });
});
