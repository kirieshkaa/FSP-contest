CREATE TABLE IF NOT EXISTS query_service.queries (
  query_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  query_title TEXT,
  file_path TEXT NOT NULL,
  created_at TIMESTAMP with TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_have_query
      FOREIGN KEY (user_id) REFERENCES auth_service.users (user_id)
      ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS query_service.query_responses (
  response_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id UUID NOT NULL UNIQUE,
  response_json JSONB NOT NULL,
  created_at TIMESTAMP with TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_query_have_response
      FOREIGN KEY (query_id) REFERENCES query_service.queries (query_id)
      ON DELETE CASCADE
);

CREATE INDEX queries_user_id_idx ON query_service.queries(user_id);

-- Additional indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_queries_created_at ON query_service.queries(created_at);
CREATE INDEX IF NOT EXISTS idx_query_responses_query_id ON query_service.query_responses(query_id);
