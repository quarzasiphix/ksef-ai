-- Create client_milestones table
CREATE TABLE IF NOT EXISTS client_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'waiting', 'completed')),
  order_index INTEGER NOT NULL DEFAULT 0,
  visible_to_client BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create client_tasks table
CREATE TABLE IF NOT EXISTS client_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES client_milestones(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'blocked', 'done')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  client_visible BOOLEAN NOT NULL DEFAULT false,
  blocked_reason TEXT CHECK (blocked_reason IN ('waiting_on_client', 'external', 'internal')),
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_client_milestones_client_id ON client_milestones(client_id);
CREATE INDEX idx_client_milestones_order ON client_milestones(client_id, order_index);
CREATE INDEX idx_client_tasks_client_id ON client_tasks(client_id);
CREATE INDEX idx_client_tasks_milestone_id ON client_tasks(milestone_id);
CREATE INDEX idx_client_tasks_status ON client_tasks(status);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_client_milestones_updated_at
  BEFORE UPDATE ON client_milestones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_tasks_updated_at
  BEFORE UPDATE ON client_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE client_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client_milestones
CREATE POLICY "Users can view milestones for their workspace clients"
  ON client_milestones FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients WHERE id = client_id
    )
  );

CREATE POLICY "Users can insert milestones for their workspace clients"
  ON client_milestones FOR INSERT
  WITH CHECK (
    client_id IN (
      SELECT id FROM clients WHERE id = client_id
    )
  );

CREATE POLICY "Users can update milestones for their workspace clients"
  ON client_milestones FOR UPDATE
  USING (
    client_id IN (
      SELECT id FROM clients WHERE id = client_id
    )
  );

CREATE POLICY "Users can delete milestones for their workspace clients"
  ON client_milestones FOR DELETE
  USING (
    client_id IN (
      SELECT id FROM clients WHERE id = client_id
    )
  );

-- RLS Policies for client_tasks
CREATE POLICY "Users can view tasks for their workspace clients"
  ON client_tasks FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients WHERE id = client_id
    )
  );

CREATE POLICY "Users can insert tasks for their workspace clients"
  ON client_tasks FOR INSERT
  WITH CHECK (
    client_id IN (
      SELECT id FROM clients WHERE id = client_id
    )
  );

CREATE POLICY "Users can update tasks for their workspace clients"
  ON client_tasks FOR UPDATE
  USING (
    client_id IN (
      SELECT id FROM clients WHERE id = client_id
    )
  );

CREATE POLICY "Users can delete tasks for their workspace clients"
  ON client_tasks FOR DELETE
  USING (
    client_id IN (
      SELECT id FROM clients WHERE id = client_id
    )
  );

-- Add comment
COMMENT ON TABLE client_milestones IS 'Client-facing milestones for work progress tracking';
COMMENT ON TABLE client_tasks IS 'Internal delivery tasks that may be linked to milestones';
