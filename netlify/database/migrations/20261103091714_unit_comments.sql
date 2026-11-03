-- Practical notes per unit, e.g. "Hund i bur". No names, phone numbers or health data.
ALTER TABLE unit_status
  ADD COLUMN board_comment TEXT NOT NULL DEFAULT '' CHECK (char_length(board_comment) <= 500),
  ADD COLUMN craftsman_comment TEXT NOT NULL DEFAULT '' CHECK (char_length(craftsman_comment) <= 500);
