export interface ICreateIssuePayload {
  title: string;
  description: string;
  type: "bug" | "feature_request";
}

export interface IGetIssuesQuery {
  sort?: "newest" | "oldest";
  type?: "bug" | "feature_request";
  status?: "open" | "in_progress" | "resolved";
}

export interface IUpdateIssuePayload {
  title?: string;
  description?: string;
  type?: "bug" | "feature_request";
  status?: "open" | "in_progress" | "resolved";
}
