export async function seed({ count, variant = "standard" }) {
    const db = await new Promise((resolve, reject) => { const r = indexedDB.open('consulting_math_drill_tool'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    const tx = db.transaction(['drill_sessions', 'responses'], 'readwrite');
    const done = new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); });
    for (let n = 0; n < count; n++) {
      const id = `audit-history-${n}`;
      const startedAt = new Date(Date.UTC(2024, 0, 1) + n * 3600000).toISOString();
      const questionCount = variant === 'large-record' ? 250 : 20;
      const endedAt = new Date(Date.parse(startedAt) + questionCount * 10000).toISOString();
      const questions = Array.from({ length: questionCount }, (_, j) => ({ id: `audit-question-${j}`, type: 'numeric', category: 'arithmetic', tags: ['addition'], difficulty: 'beginner', prompt: variant === 'large-record' ? `What is ${j + 10} + 20? `.padEnd(99000, 'x') : `What is ${j + 10} + 20?`, answer: { value: j + 30, unit: 'none' }, explanation: { short: 'Add the two values.', steps: [`${j + 10} + 20 = ${j + 30}.`] }, metadata: { sourceType: 'generated' } }));
      const responses = questions.map((q, j) => ({ questionId: q.id, rawInput: String(q.answer.value + (j % 5 === 0 ? 1 : 0)), normalizedValue: q.answer.value + (j % 5 === 0 ? 1 : 0), isCorrect: j % 5 !== 0, errorTypes: j % 5 === 0 ? ['arithmetic_error'] : ['none'], timeTakenSeconds: 10, submittedAt: new Date(Date.parse(startedAt) + (j + 1) * 10000).toISOString() }));
      const score = { totalScore: questionCount * 80, accuracy: 0.8, averageTimeSeconds: 10, correctCount: questionCount * 0.8, incorrectCount: questionCount * 0.2, categoryBreakdown: [{ category: 'arithmetic', accuracy: 0.8, averageTimeSeconds: 10, questionCount }], errorBreakdown: [{ errorType: 'arithmetic_error', count: questionCount * 0.2 }] };
      tx.objectStore('drill_sessions').put({ id, startedAt, endedAt, updatedAt: endedAt, settings: { categories: ['arithmetic'], difficulty: 'beginner', questionCount, timeMode: 'untimed', feedbackMode: 'instant' }, questionIds: questions.map(q => q.id), questions, responses, score });
      for (const response of responses) tx.objectStore('responses').put({ ...response, id: `${id}:${response.questionId}`, sessionId: id, category: 'arithmetic', tags: ['addition'] });
    }
    await done; db.close();
  }
