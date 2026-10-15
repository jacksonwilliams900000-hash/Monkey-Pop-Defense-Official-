```javascript
import pg from 'pg';

const { Pool } = pg;

const connectionString =
  process.env.DATABASE_URL || process.env.POSTGRES_URL;

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : undefined,
});

let initialized = false;

export async function initializeDailyQuiz() {
  if (initialized) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS daily_quiz_questions (
      id BIGSERIAL PRIMARY KEY,
      quiz_date DATE NOT NULL UNIQUE,
      question TEXT NOT NULL,
      answers JSONB NOT NULL,
      correct_answer INTEGER NOT NULL,
      explanation TEXT,
      created_by TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS daily_quiz_attempts (
      id BIGSERIAL PRIMARY KEY,
      quiz_date DATE NOT NULL,
      user_id TEXT NOT NULL,
      selected_answer INTEGER NOT NULL,
      is_correct BOOLEAN NOT NULL,
      attempted_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (quiz_date, user_id)
    );
  `);

  initialized = true;
}

export async function createDailyQuiz({
  quizDate,
  question,
  answers,
  correctAnswer,
  explanation = '',
  createdBy,
}) {
  await initializeDailyQuiz();

  if (!Array.isArray(answers) || answers.length !== 4) {
    throw new Error('A quiz must have exactly four answers.');
  }

  if (!Number.isInteger(correctAnswer) ||
      correctAnswer < 0 || correctAnswer > 3) {
    throw new Error('The correct answer must be between 0 and 3.');
  }

  const result = await pool.query(
    `INSERT INTO daily_quiz_questions
      (quiz_date, question, answers, correct_answer, explanation, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (quiz_date) DO UPDATE SET
       question = EXCLUDED.question,
       answers = EXCLUDED.answers,
       correct_answer = EXCLUDED.correct_answer,
       explanation = EXCLUDED.explanation,
       created_by = EXCLUDED.created_by
     RETURNING *`,
    [
      quizDate,
      question,
      JSON.stringify(answers),
      correctAnswer,
      explanation,
      createdBy,
    ]
  );

  return result.rows[0];
}

export async function getDailyQuiz(quizDate) {
  await initializeDailyQuiz();

  const result = await pool.query(
    `SELECT * FROM daily_quiz_questions
     WHERE quiz_date = $1`,
    [quizDate]
  );

  return result.rows[0] ?? null;
}

export async function submitDailyQuizAnswer({
  quizDate,
  userId,
  selectedAnswer,
}) {
  await initializeDailyQuiz();

  const quiz = await getDailyQuiz(quizDate);

  if (!quiz) {
    throw new Error('No quiz has been published for today.');
  }

  if (!Number.isInteger(selectedAnswer) ||
      selectedAnswer < 0 || selectedAnswer > 3) {
    throw new Error('Invalid answer selection.');
  }

  const isCorrect = selectedAnswer === quiz.correct_answer;

  try {
    await pool.query(
      `INSERT INTO daily_quiz_attempts
        (quiz_date, user_id, selected_answer, is_correct)
       VALUES ($1, $2, $3, $4)`,
      [quizDate, userId, selectedAnswer, isCorrect]
    );
  } catch (error) {
    if (error.code === '23505') {
      return { alreadyAttempted: true };
    }

    throw error;
  }

  return {
    alreadyAttempted: false,
    isCorrect,
    correctAnswer: quiz.correct_answer,
    explanation: quiz.explanation,
  };
}

export async function getDailyQuizLeaderboard(limit = 10) {
  await initializeDailyQuiz();

  const result = await pool.query(
    `SELECT
       user_id,
       COUNT(*) FILTER (WHERE is_correct) AS correct_answers,
       COUNT(*) AS total_attempts
     FROM daily_quiz_attempts
     GROUP BY user_id
     ORDER BY
       COUNT(*) FILTER (WHERE is_correct) DESC,
       COUNT(*) DESC,
       user_id ASC
     LIMIT $1`,
    [Math.max(1, Math.min(100, Math.floor(limit)))]
  );

  return result.rows;
}
```
