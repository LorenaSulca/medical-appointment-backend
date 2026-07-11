import { jsonResponse } from "../../src/shared/http/json-response";

describe("jsonResponse", () => {
  it("construye una respuesta HTTP con contenido JSON", () => {
    const result = jsonResponse(202, {
      status: "pending"
    });

    expect(result).toEqual({
      statusCode: 202,
      headers: {
        "content-type": "application/json; charset=utf-8"
      },
      body: JSON.stringify({
        status: "pending"
      })
    });
  });
});