-- Add question_time column to answers table for tracking time spent on each specific question
ALTER TABLE answers ADD COLUMN question_time INT DEFAULT NULL;