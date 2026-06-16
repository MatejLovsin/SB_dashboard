-- Track when a card was moved into the "done" column so we can
-- auto-hide it after 7 days without relying on created_at.

ALTER TABLE roadmap_cards ADD COLUMN done_at timestamptz;

-- Stamp done_at when status transitions TO done; clear it on the way out.
-- Stays unchanged if the card is already done and something else is edited.
CREATE OR REPLACE FUNCTION set_roadmap_done_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'done' AND OLD.status IS DISTINCT FROM 'done' THEN
    NEW.done_at = now();
  ELSIF NEW.status != 'done' AND OLD.status = 'done' THEN
    NEW.done_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_roadmap_done_at
BEFORE UPDATE ON roadmap_cards
FOR EACH ROW EXECUTE FUNCTION set_roadmap_done_at();
