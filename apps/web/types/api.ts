export interface HealthResponse {
  status: "ok";
  version: string;
  database: "connected";
}

export interface ApiErrorResponse {
  error: { code: string; message: string; request_id?: string };
}
