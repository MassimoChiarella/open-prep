import type { PartialMessageCatalog } from "@/features/i18n/i18n";

const es = {
  "Case Practice": "Práctica de casos", "Case Skills": "Habilidades de casos", "Back to Case Practice": "Volver a práctica de casos",
  "Return to Case Practice": "Volver a práctica de casos", "Choose a focused skill": "Elige una habilidad concreta", "Build Prep Plan": "Crear plan de preparación",
  "Complete one module or combine them in the full-case workflow.": "Completa un módulo o combínalos en el flujo de caso completo.",
  "Open {module}": "Abrir {module}", "Open {title}": "Abrir {title}", "Opening": "Apertura", "Exploration": "Exploración", "Closing": "Cierre",
  "Learn": "Aprender", "Behavioral": "Conductual", "Roadmap": "Hoja de ruta", "Integrated": "Integrado", "Structuring": "Estructuración",
  "Brainstorming": "Lluvia de ideas", "Synthesis": "Síntesis", "Concept Lessons": "Lecciones conceptuales", "Fit Practice": "Práctica conductual",
  "Prep Plan": "Plan de preparación", "Full Case": "Caso completo", "Structured Brainstorming": "Lluvia de ideas estructurada",
  "Build your answer": "Construye tu respuesta", "Prompt": "Enunciado", "Optional reflection note": "Nota de reflexión opcional",
  "Capture your reasoning for the two priorities": "Explica tu razonamiento para las dos prioridades", "For reflection only; it does not affect the score or saved result.": "Solo para reflexionar; no afecta a la puntuación ni al resultado guardado.",
  "Score and Save": "Puntuar y guardar", "Reset": "Restablecer", "Saving...": "Guardando...", "Save status": "Estado de guardado",
  "Ideas {selected}/{total}": "Ideas {selected}/{total}", "Priorities {selected}/{total}": "Prioridades {selected}/{total}",
  "Include {idea}": "Incluir {idea}", "Prioritize {idea}": "Priorizar {idea}", "Priority": "Prioridad", "Result": "Resultado",
  "Brainstorming score": "Puntuación de lluvia de ideas", "Coverage": "Cobertura", "Relevance": "Relevancia", "Prioritization": "Priorización",
  "Relevant ideas missed": "Ideas relevantes omitidas", "Off-brief selections": "Selecciones fuera del objetivo", "Benchmark priorities": "Prioridades de referencia",
  "You covered every relevant benchmark idea.": "Cubriste todas las ideas relevantes de referencia.", "No off-brief ideas selected.": "No seleccionaste ideas fuera del objetivo.",
  "No benchmark priorities are configured.": "No hay prioridades de referencia configuradas.", "This brainstorming result was added to your local practice history.": "Este resultado se añadió a tu historial local.",
  "Your score is available below, but it could not be saved on this device.": "Tu puntuación aparece abajo, pero no se pudo guardar en este dispositivo.",
  "Select {ideas} ideas and mark {priorities} as priorities.": "Selecciona {ideas} ideas y marca {priorities} como prioritarias.",
  "Case structuring": "Estructuración de casos", "Practice case": "Caso de práctica", "Your task:": "Tu tarea:", "1. Choose an initial hypothesis": "1. Elige una hipótesis inicial",
  "2. Build the issue tree": "2. Construye el árbol de problemas", "Hypothesis": "Hipótesis", "Issue tree": "Árbol de problemas", "Score Structure": "Puntuar estructura",
  "Pick the most useful proposition to test first. It should focus the analysis without assuming the answer.": "Elige la proposición más útil para probar primero. Debe enfocar el análisis sin asumir la respuesta.",
  "Choose up to {count} distinct workstreams. Prioritize branches that directly answer the objective.": "Elige hasta {count} líneas de trabajo distintas. Prioriza las ramas que respondan directamente al objetivo.",
  "{selected} / {total} selected": "{selected} / {total} seleccionadas", "Completed": "Completado", "Structure review": "Revisión de estructura",
  "Model structure": "Estructura modelo", "Covered": "Cubierto", "Missed": "Omitido", "Retry Case": "Reintentar caso", "Next Case": "Siguiente caso",
  "Recording this completed attempt in local progress.": "Registrando este intento en el progreso local.", "This structuring result is available to local progress and future case workflows.": "Este resultado está disponible en el progreso local y futuros casos.",
  "Your score is still visible, but this attempt could not be saved locally.": "La puntuación sigue visible, pero el intento no se pudo guardar localmente.",
  "Not Saved": "No guardado", "Saving": "Guardando", "Use these branches as a comparison, not as a script to memorize.": "Usa estas ramas como comparación, no como guion para memorizar.",
  "Case prompt": "Enunciado del caso", "Case evidence": "Evidencia del caso", "Score Response": "Puntuar respuesta", "Response Scored": "Respuesta puntuada",
  "Clear Response": "Borrar respuesta", "Attempt Status": "Estado del intento", "Response review": "Revisión de respuesta", "Model close": "Cierre modelo",
  "Answer-first recommendation": "Recomendación directa", "Strongest supporting evidence": "Evidencia principal", "Most important risk": "Riesgo principal", "Best next step": "Mejor siguiente paso",
  "Select one option in each section before scoring your response.": "Selecciona una opción en cada sección antes de puntuar la respuesta.",
  "Saving this attempt on your device...": "Guardando este intento en tu dispositivo...", "Score {score}/{maxScore} saved on this device.": "Puntuación {score}/{maxScore} guardada en este dispositivo.",
  "Score {score}/{maxScore} is ready, but this attempt could not be saved.": "La puntuación {score}/{maxScore} está lista, pero no se pudo guardar el intento.",
  "Synthesis practice is unavailable.": "La práctica de síntesis no está disponible.", "Synthesis prompts could not be loaded.": "No se pudieron cargar los ejercicios de síntesis.",
  "Lesson Progress": "Progreso de lecciones", "Mastered checks are stored on this device.": "Las comprobaciones dominadas se guardan en este dispositivo.",
  "{mastered} of {total} mastered": "{mastered} de {total} dominadas", "{mastered} of {total} lessons mastered": "{mastered} de {total} lecciones dominadas",
  "Lesson progression": "Progresión de lecciones", "Lesson {number}": "Lección {number}", "Lesson {current} of {total}": "Lección {current} de {total}",
  "Mastered": "Dominada", "Open": "Abrir", "Core Principle": "Principio clave", "Worked Example": "Ejemplo resuelto", "Knowledge Check": "Comprobación de conocimientos",
  "Check Answer": "Comprobar respuesta", "Check Again": "Comprobar de nuevo", "Previous Lesson": "Lección anterior", "Next Lesson": "Lección siguiente",
  "Local save": "Guardado local", "Saved on this device": "Guardado en este dispositivo", "Concept lessons could not be loaded.": "No se pudieron cargar las lecciones.",
  "Lessons are unavailable.": "Las lecciones no están disponibles.", "Saved lesson progress could not be loaded on this device.": "No se pudo cargar el progreso guardado en este dispositivo.",
  "This knowledge check was saved on this device.": "Esta comprobación se guardó en este dispositivo.", "This result could not be saved on this device.": "Este resultado no se pudo guardar en este dispositivo.",
  "Story Bank": "Banco de historias", "STAR and PEI stories": "Historias STAR y PEI", "{count} saved": "{count} guardadas", "Saved stories": "Historias guardadas",
  "Add your first story to begin a rehearsal.": "Añade tu primera historia para empezar un ensayo.", "Edit": "Editar", "Rehearse": "Ensayar", "Delete": "Eliminar",
  "Timed Rehearsal": "Ensayo cronometrado", "Practice an interview answer": "Practica una respuesta de entrevista", "Story": "Historia", "No saved stories": "No hay historias guardadas",
  "Answer time": "Tiempo de respuesta", "{seconds} seconds": "{seconds} segundos", "{seconds} seconds remaining": "Quedan {seconds} segundos", "Finish Answer": "Finalizar respuesta",
  "Start Rehearsal": "Iniciar ensayo", "Rehearse Again": "Ensayar de nuevo", "Self-review checklist": "Lista de autoevaluación", "Save Self-Review": "Guardar autoevaluación",
  "This records your checklist selections; it does not grade your story text.": "Esto registra tu lista; no califica el texto de la historia.", "Self-review saved locally: {score}/{total}.": "Autoevaluación guardada localmente: {score}/{total}.",
  "Self-review could not be saved.": "No se pudo guardar la autoevaluación.", "Save a story to unlock a matching rehearsal prompt.": "Guarda una historia para desbloquear un enunciado relacionado.",
  "Add a story": "Añadir una historia", "Edit story": "Editar historia", "Cancel": "Cancelar", "Complete every story field before saving.": "Completa todos los campos antes de guardar.",
  "Story title": "Título de la historia", "Competency": "Competencia", "Situation": "Situación", "Task": "Tarea", "Action": "Acción", "Reflection": "Reflexión",
  "Save Story": "Guardar historia", "Update Story": "Actualizar historia", "Leadership": "Liderazgo", "Conflict": "Conflicto", "Failure": "Fracaso", "Impact": "Impacto",
  "Weekly Prep Plan": "Plan semanal de preparación", "Preparation": "Preparación", "Preparation profile": "Perfil de preparación", "Experience level": "Nivel de experiencia",
  "Beginner": "Principiante", "Intermediate": "Intermedio", "Advanced": "Avanzado", "Interview date (optional)": "Fecha de entrevista (opcional)",
  "Target firms (optional)": "Empresas objetivo (opcional)", "Firm A, Firm B": "Empresa A, Empresa B", "Separate firm names with commas.": "Separa los nombres con comas.",
  "Practice sessions per week": "Sesiones de práctica por semana", "Save Profile": "Guardar perfil", "Update Profile": "Actualizar perfil", "Saved only in this browser.": "Guardado solo en este navegador.",
  "Plan basis": "Base del plan", "Current snapshot": "Resumen actual", "Weekly sessions": "Sesiones semanales", "Interview timing": "Fecha de entrevista", "Math questions": "Preguntas de cálculo",
  "Case attempts": "Intentos de caso", "Target firms": "Empresas objetivo", "Not specified": "No especificado", "Not scheduled": "Sin programar", "Today": "Hoy", "Date passed; update profile": "La fecha pasó; actualiza el perfil",
  "Prioritized roadmap": "Hoja de ruta priorizada", "This week": "Esta semana", "Priority {number}": "Prioridad {number}", "Browse all ranked practice areas": "Ver todas las áreas priorizadas",
  "session": "sesión", "sessions": "sesiones", "focus": "objetivo", "focuses": "objetivos", "day": "día", "days": "días",
  "Preparation data is unavailable.": "Los datos de preparación no están disponibles.", "Open Settings": "Abrir configuración",
  "Building your preparation snapshot...": "Creando tu resumen de preparación...", "Reading your profile and saved practice history from this browser.": "Leyendo tu perfil e historial guardado en este navegador.",
  "Your preparation profile and weekly target are saved.": "Tu perfil y objetivo semanal están guardados.", "Save failed": "Error al guardar",
  "Full Case Simulation": "Simulación de caso completo", "Integrated Practice": "Práctica integrada", "Case stages": "Etapas del caso", "Stage {number}": "Etapa {number}",
  "Structure": "Estructura", "Exhibit and math": "Gráfico y cálculo", "Brainstorm": "Ideas", "Synthesize": "Sintetizar", "Previous Stage": "Etapa anterior",
  "Continue to {stage}": "Continuar a {stage}", "Complete Case": "Completar caso", "Open the case": "Abrir el caso", "Read the exhibit and calculate": "Leer el gráfico y calcular",
  "Your answer (Currency)": "Tu respuesta (moneda)", "Enter a value": "Introduce un valor", "Brainstorming stage": "Etapa de lluvia de ideas", "Generate and prioritize actions": "Genera y prioriza acciones",
  "Close the case": "Cerrar el caso", "Evidence collected": "Evidencia reunida", "Case complete": "Caso completado", "Integrated case review": "Revisión integrada del caso",
  "Structure feedback": "Comentarios de estructura", "Exhibit and math feedback": "Comentarios de gráfico y cálculo", "Brainstorming feedback": "Comentarios de lluvia de ideas",
  "Retry Full Case": "Reintentar caso completo", "Recording the completed case in local progress.": "Registrando el caso completado en el progreso local.",
  "This full-case result is available to your local preparation roadmap.": "Este resultado está disponible en tu hoja de ruta local.",
  "Your score is still visible, but this case could not be saved locally.": "La puntuación sigue visible, pero el caso no se pudo guardar localmente.",
  "Loading case practice...": "Cargando práctica de casos...", "Synthesis and Recommendation": "Síntesis y recomendación", "Fit and Behavioral Practice": "Práctica conductual"
};

const fr = { "Case Practice": "Pratique des cas", "Back to Case Practice": "Retour à la pratique des cas", "Choose a focused skill": "Choisir une compétence", "Structuring": "Structuration", "Brainstorming": "Idéation", "Synthesis": "Synthèse", "Concept Lessons": "Leçons de concepts", "Fit Practice": "Pratique comportementale", "Full Case": "Cas complet", "Prompt": "Énoncé", "Score and Save": "Évaluer et enregistrer", "Saving...": "Enregistrement...", "Reset": "Réinitialiser", "Result": "Résultat", "Coverage": "Couverture", "Relevance": "Pertinence", "Priority": "Priorité", "Case structuring": "Structuration de cas", "Score Structure": "Évaluer la structure", "Model structure": "Structure modèle", "Next Case": "Cas suivant", "Knowledge Check": "Test de connaissances", "Check Answer": "Vérifier la réponse", "Previous Lesson": "Leçon précédente", "Next Lesson": "Leçon suivante", "Story Bank": "Banque d’histoires", "Start Rehearsal": "Commencer la répétition", "Weekly Prep Plan": "Plan de préparation hebdomadaire", "Full Case Simulation": "Simulation de cas complet", "Complete Case": "Terminer le cas" };
const de = { "Case Practice": "Fallstudienpraxis", "Back to Case Practice": "Zurück zur Fallpraxis", "Choose a focused skill": "Fähigkeit auswählen", "Structuring": "Strukturierung", "Brainstorming": "Ideensammlung", "Synthesis": "Synthese", "Concept Lessons": "Konzeptlektionen", "Fit Practice": "Fit-Übung", "Full Case": "Vollständiger Fall", "Prompt": "Aufgabe", "Score and Save": "Bewerten und speichern", "Saving...": "Wird gespeichert...", "Reset": "Zurücksetzen", "Result": "Ergebnis", "Coverage": "Abdeckung", "Relevance": "Relevanz", "Priority": "Priorität", "Case structuring": "Fallstrukturierung", "Score Structure": "Struktur bewerten", "Model structure": "Musterstruktur", "Next Case": "Nächster Fall", "Knowledge Check": "Wissenstest", "Check Answer": "Antwort prüfen", "Previous Lesson": "Vorherige Lektion", "Next Lesson": "Nächste Lektion", "Story Bank": "Geschichtenbank", "Start Rehearsal": "Probe starten", "Weekly Prep Plan": "Wöchentlicher Vorbereitungsplan", "Full Case Simulation": "Vollständige Fallsimulation", "Complete Case": "Fall abschließen" };
const pt = { "Case Practice": "Prática de casos", "Back to Case Practice": "Voltar à prática de casos", "Choose a focused skill": "Escolha uma habilidade", "Structuring": "Estruturação", "Brainstorming": "Brainstorming", "Synthesis": "Síntese", "Concept Lessons": "Lições conceituais", "Fit Practice": "Prática comportamental", "Full Case": "Caso completo", "Prompt": "Enunciado", "Score and Save": "Pontuar e salvar", "Saving...": "Salvando...", "Reset": "Redefinir", "Result": "Resultado", "Coverage": "Cobertura", "Relevance": "Relevância", "Priority": "Prioridade", "Case structuring": "Estruturação de caso", "Score Structure": "Pontuar estrutura", "Model structure": "Estrutura modelo", "Next Case": "Próximo caso", "Knowledge Check": "Teste de conhecimento", "Check Answer": "Verificar resposta", "Previous Lesson": "Lição anterior", "Next Lesson": "Próxima lição", "Story Bank": "Banco de histórias", "Start Rehearsal": "Iniciar ensaio", "Weekly Prep Plan": "Plano semanal de preparação", "Full Case Simulation": "Simulação de caso completo", "Complete Case": "Concluir caso" };
const zhHans = { "Case Practice": "案例练习", "Back to Case Practice": "返回案例练习", "Choose a focused skill": "选择专项技能", "Structuring": "结构化", "Brainstorming": "头脑风暴", "Synthesis": "综合结论", "Concept Lessons": "概念课程", "Fit Practice": "行为面试练习", "Full Case": "完整案例", "Prompt": "题目", "Score and Save": "评分并保存", "Saving...": "正在保存...", "Reset": "重置", "Result": "结果", "Coverage": "覆盖度", "Relevance": "相关性", "Priority": "优先级", "Case structuring": "案例结构化", "Score Structure": "为结构评分", "Model structure": "参考结构", "Next Case": "下一个案例", "Knowledge Check": "知识检查", "Check Answer": "检查答案", "Previous Lesson": "上一课", "Next Lesson": "下一课", "Story Bank": "故事库", "Start Rehearsal": "开始演练", "Weekly Prep Plan": "每周准备计划", "Full Case Simulation": "完整案例模拟", "Complete Case": "完成案例" };
const zhHant = { "Case Practice": "案例練習", "Back to Case Practice": "返回案例練習", "Choose a focused skill": "選擇專項技能", "Structuring": "結構化", "Brainstorming": "腦力激盪", "Synthesis": "綜合結論", "Concept Lessons": "概念課程", "Fit Practice": "行為面試練習", "Full Case": "完整案例", "Prompt": "題目", "Score and Save": "評分並儲存", "Saving...": "正在儲存...", "Reset": "重設", "Result": "結果", "Coverage": "涵蓋度", "Relevance": "相關性", "Priority": "優先順序", "Case structuring": "案例結構化", "Score Structure": "為結構評分", "Model structure": "參考結構", "Next Case": "下一個案例", "Knowledge Check": "知識檢查", "Check Answer": "檢查答案", "Previous Lesson": "上一課", "Next Lesson": "下一課", "Story Bank": "故事庫", "Start Rehearsal": "開始演練", "Weekly Prep Plan": "每週準備計畫", "Full Case Simulation": "完整案例模擬", "Complete Case": "完成案例" };
const ja = { "Case Practice": "ケース練習", "Back to Case Practice": "ケース練習に戻る", "Choose a focused skill": "重点スキルを選ぶ", "Structuring": "構造化", "Brainstorming": "ブレインストーミング", "Synthesis": "まとめ", "Concept Lessons": "コンセプト講座", "Fit Practice": "人物面接練習", "Full Case": "フルケース", "Prompt": "問題", "Score and Save": "採点して保存", "Saving...": "保存中...", "Reset": "リセット", "Result": "結果", "Coverage": "網羅性", "Relevance": "関連性", "Priority": "優先度", "Case structuring": "ケース構造化", "Score Structure": "構造を採点", "Model structure": "モデル構造", "Next Case": "次のケース", "Knowledge Check": "知識チェック", "Check Answer": "回答を確認", "Previous Lesson": "前のレッスン", "Next Lesson": "次のレッスン", "Story Bank": "ストーリーバンク", "Start Rehearsal": "練習を開始", "Weekly Prep Plan": "週間準備プラン", "Full Case Simulation": "フルケースシミュレーション", "Complete Case": "ケースを完了" };
const ar = { "Case Practice": "تدريب الحالات", "Back to Case Practice": "العودة إلى تدريب الحالات", "Choose a focused skill": "اختر مهارة محددة", "Structuring": "الهيكلة", "Brainstorming": "العصف الذهني", "Synthesis": "الخلاصة", "Concept Lessons": "دروس المفاهيم", "Fit Practice": "التدريب السلوكي", "Full Case": "حالة كاملة", "Prompt": "المسألة", "Score and Save": "التقييم والحفظ", "Saving...": "جارٍ الحفظ...", "Reset": "إعادة تعيين", "Result": "النتيجة", "Coverage": "التغطية", "Relevance": "الصلة", "Priority": "الأولوية", "Case structuring": "هيكلة الحالة", "Score Structure": "تقييم الهيكل", "Model structure": "الهيكل النموذجي", "Next Case": "الحالة التالية", "Knowledge Check": "اختبار المعرفة", "Check Answer": "تحقق من الإجابة", "Previous Lesson": "الدرس السابق", "Next Lesson": "الدرس التالي", "Story Bank": "بنك القصص", "Start Rehearsal": "بدء التدريب", "Weekly Prep Plan": "خطة التحضير الأسبوعية", "Full Case Simulation": "محاكاة حالة كاملة", "Complete Case": "إكمال الحالة" };
const hi = { "Case Practice": "केस अभ्यास", "Back to Case Practice": "केस अभ्यास पर लौटें", "Choose a focused skill": "केंद्रित कौशल चुनें", "Structuring": "संरचना", "Brainstorming": "विचार-मंथन", "Synthesis": "निष्कर्ष", "Concept Lessons": "अवधारणा पाठ", "Fit Practice": "व्यवहारिक अभ्यास", "Full Case": "पूरा केस", "Prompt": "प्रश्न", "Score and Save": "अंक दें और सहेजें", "Saving...": "सहेजा जा रहा है...", "Reset": "रीसेट", "Result": "परिणाम", "Coverage": "कवरेज", "Relevance": "प्रासंगिकता", "Priority": "प्राथमिकता", "Case structuring": "केस संरचना", "Score Structure": "संरचना को अंक दें", "Model structure": "आदर्श संरचना", "Next Case": "अगला केस", "Knowledge Check": "ज्ञान जाँच", "Check Answer": "उत्तर जाँचें", "Previous Lesson": "पिछला पाठ", "Next Lesson": "अगला पाठ", "Story Bank": "कहानी संग्रह", "Start Rehearsal": "अभ्यास शुरू करें", "Weekly Prep Plan": "साप्ताहिक तैयारी योजना", "Full Case Simulation": "पूरा केस सिमुलेशन", "Complete Case": "केस पूरा करें" };

Object.assign(fr, {
  "Structured Brainstorming": "Idéation structurée", "Build your answer": "Construisez votre réponse", "Optional reflection note": "Note de réflexion facultative",
  "Ideas {selected}/{total}": "Idées {selected}/{total}", "Priorities {selected}/{total}": "Priorités {selected}/{total}", "Include {idea}": "Inclure {idea}", "Prioritize {idea}": "Prioriser {idea}",
  "Brainstorming score": "Score d’idéation", "Prioritization": "Priorisation", "Relevant ideas missed": "Idées pertinentes manquées", "Save status": "État de l’enregistrement",
  "Practice case": "Cas d’entraînement", "Your task:": "Votre tâche :", "1. Choose an initial hypothesis": "1. Choisissez une hypothèse initiale", "2. Build the issue tree": "2. Construisez l’arbre de problèmes",
  "Hypothesis": "Hypothèse", "Issue tree": "Arbre de problèmes", "Completed": "Terminé", "Structure review": "Révision de la structure", "Covered": "Couvert", "Missed": "Manqué", "Retry Case": "Réessayer le cas",
  "Case prompt": "Énoncé du cas", "Case evidence": "Éléments du cas", "Score Response": "Évaluer la réponse", "Response Scored": "Réponse évaluée", "Clear Response": "Effacer la réponse", "Response review": "Révision de la réponse", "Model close": "Conclusion modèle",
  "Lesson Progress": "Progression des leçons", "Mastered": "Maîtrisé", "Open": "Ouvrir", "Core Principle": "Principe clé", "Worked Example": "Exemple résolu", "Local save": "Enregistrement local", "Saved on this device": "Enregistré sur cet appareil",
  "Saved stories": "Histoires enregistrées", "Edit": "Modifier", "Rehearse": "Répéter", "Delete": "Supprimer", "Timed Rehearsal": "Répétition chronométrée", "Story": "Histoire", "Answer time": "Temps de réponse", "Finish Answer": "Terminer la réponse", "Rehearse Again": "Répéter à nouveau",
  "Self-review checklist": "Liste d’autoévaluation", "Save Self-Review": "Enregistrer l’autoévaluation", "Add a story": "Ajouter une histoire", "Edit story": "Modifier l’histoire", "Cancel": "Annuler", "Story title": "Titre de l’histoire", "Competency": "Compétence",
  "Situation": "Situation", "Task": "Tâche", "Action": "Action", "Result": "Résultat", "Reflection": "Réflexion", "Save Story": "Enregistrer l’histoire", "Update Story": "Mettre à jour l’histoire",
  "Preparation": "Préparation", "Preparation profile": "Profil de préparation", "Experience level": "Niveau d’expérience", "Beginner": "Débutant", "Intermediate": "Intermédiaire", "Advanced": "Avancé", "Interview date (optional)": "Date d’entretien (facultatif)",
  "Target firms (optional)": "Entreprises cibles (facultatif)", "Practice sessions per week": "Séances par semaine", "Save Profile": "Enregistrer le profil", "Update Profile": "Mettre à jour le profil", "Current snapshot": "Aperçu actuel", "Weekly sessions": "Séances hebdomadaires", "This week": "Cette semaine",
  "Integrated Practice": "Pratique intégrée", "Case stages": "Étapes du cas", "Stage {number}": "Étape {number}", "Structure": "Structure", "Exhibit and math": "Graphique et calcul", "Brainstorm": "Idéation", "Synthesize": "Synthèse", "Previous Stage": "Étape précédente", "Continue to {stage}": "Continuer vers {stage}",
  "Open the case": "Ouvrir le cas", "Read the exhibit and calculate": "Lire le graphique et calculer", "Close the case": "Conclure le cas", "Case complete": "Cas terminé", "Integrated case review": "Révision intégrée du cas", "Retry Full Case": "Réessayer le cas complet", "Not Saved": "Non enregistré", "Saving": "Enregistrement"
});

Object.assign(de, {
  "Structured Brainstorming": "Strukturierte Ideensammlung", "Build your answer": "Antwort aufbauen", "Optional reflection note": "Optionale Reflexionsnotiz",
  "Ideas {selected}/{total}": "Ideen {selected}/{total}", "Priorities {selected}/{total}": "Prioritäten {selected}/{total}", "Include {idea}": "{idea} einbeziehen", "Prioritize {idea}": "{idea} priorisieren",
  "Brainstorming score": "Ideensammlungs-Punktzahl", "Prioritization": "Priorisierung", "Relevant ideas missed": "Fehlende relevante Ideen", "Save status": "Speicherstatus",
  "Practice case": "Übungsfall", "Your task:": "Ihre Aufgabe:", "1. Choose an initial hypothesis": "1. Ausgangshypothese wählen", "2. Build the issue tree": "2. Problembaum aufbauen",
  "Hypothesis": "Hypothese", "Issue tree": "Problembaum", "Completed": "Abgeschlossen", "Structure review": "Strukturauswertung", "Covered": "Abgedeckt", "Missed": "Fehlt", "Retry Case": "Fall wiederholen",
  "Case prompt": "Fallaufgabe", "Case evidence": "Fallbelege", "Score Response": "Antwort bewerten", "Response Scored": "Antwort bewertet", "Clear Response": "Antwort löschen", "Response review": "Antwortauswertung", "Model close": "Musterfazit",
  "Lesson Progress": "Lektionsfortschritt", "Mastered": "Beherrscht", "Open": "Öffnen", "Core Principle": "Kernprinzip", "Worked Example": "Ausgearbeitetes Beispiel", "Local save": "Lokale Speicherung", "Saved on this device": "Auf diesem Gerät gespeichert",
  "Saved stories": "Gespeicherte Geschichten", "Edit": "Bearbeiten", "Rehearse": "Üben", "Delete": "Löschen", "Timed Rehearsal": "Zeitübung", "Story": "Geschichte", "Answer time": "Antwortzeit", "Finish Answer": "Antwort beenden", "Rehearse Again": "Erneut üben",
  "Self-review checklist": "Selbstbewertungs-Checkliste", "Save Self-Review": "Selbstbewertung speichern", "Add a story": "Geschichte hinzufügen", "Edit story": "Geschichte bearbeiten", "Cancel": "Abbrechen", "Story title": "Titel der Geschichte", "Competency": "Kompetenz",
  "Situation": "Situation", "Task": "Aufgabe", "Action": "Handlung", "Result": "Ergebnis", "Reflection": "Reflexion", "Save Story": "Geschichte speichern", "Update Story": "Geschichte aktualisieren",
  "Preparation": "Vorbereitung", "Preparation profile": "Vorbereitungsprofil", "Experience level": "Erfahrungsniveau", "Beginner": "Anfänger", "Intermediate": "Mittelstufe", "Advanced": "Fortgeschritten", "Interview date (optional)": "Interviewdatum (optional)",
  "Target firms (optional)": "Zielunternehmen (optional)", "Practice sessions per week": "Übungseinheiten pro Woche", "Save Profile": "Profil speichern", "Update Profile": "Profil aktualisieren", "Current snapshot": "Aktueller Überblick", "Weekly sessions": "Wöchentliche Einheiten", "This week": "Diese Woche",
  "Integrated Practice": "Integrierte Übung", "Case stages": "Fallphasen", "Stage {number}": "Phase {number}", "Structure": "Struktur", "Exhibit and math": "Diagramm und Berechnung", "Brainstorm": "Ideen", "Synthesize": "Fazit", "Previous Stage": "Vorherige Phase", "Continue to {stage}": "Weiter zu {stage}",
  "Open the case": "Fall eröffnen", "Read the exhibit and calculate": "Diagramm lesen und rechnen", "Close the case": "Fall abschließen", "Case complete": "Fall abgeschlossen", "Integrated case review": "Integrierte Fallauswertung", "Retry Full Case": "Vollständigen Fall wiederholen", "Not Saved": "Nicht gespeichert", "Saving": "Wird gespeichert"
});

Object.assign(pt, {
  "Structured Brainstorming": "Brainstorming estruturado", "Build your answer": "Construa sua resposta", "Optional reflection note": "Nota de reflexão opcional",
  "Ideas {selected}/{total}": "Ideias {selected}/{total}", "Priorities {selected}/{total}": "Prioridades {selected}/{total}", "Include {idea}": "Incluir {idea}", "Prioritize {idea}": "Priorizar {idea}",
  "Brainstorming score": "Pontuação de brainstorming", "Prioritization": "Priorização", "Relevant ideas missed": "Ideias relevantes ausentes", "Save status": "Status de salvamento",
  "Practice case": "Caso de prática", "Your task:": "Sua tarefa:", "1. Choose an initial hypothesis": "1. Escolha uma hipótese inicial", "2. Build the issue tree": "2. Construa a árvore de questões",
  "Hypothesis": "Hipótese", "Issue tree": "Árvore de questões", "Completed": "Concluído", "Structure review": "Revisão da estrutura", "Covered": "Coberto", "Missed": "Ausente", "Retry Case": "Tentar caso novamente",
  "Case prompt": "Enunciado do caso", "Case evidence": "Evidências do caso", "Score Response": "Pontuar resposta", "Response Scored": "Resposta pontuada", "Clear Response": "Limpar resposta", "Response review": "Revisão da resposta", "Model close": "Conclusão modelo",
  "Lesson Progress": "Progresso das lições", "Mastered": "Dominada", "Open": "Abrir", "Core Principle": "Princípio central", "Worked Example": "Exemplo resolvido", "Local save": "Salvamento local", "Saved on this device": "Salvo neste dispositivo",
  "Saved stories": "Histórias salvas", "Edit": "Editar", "Rehearse": "Ensaiar", "Delete": "Excluir", "Timed Rehearsal": "Ensaio cronometrado", "Story": "História", "Answer time": "Tempo de resposta", "Finish Answer": "Finalizar resposta", "Rehearse Again": "Ensaiar novamente",
  "Self-review checklist": "Lista de autoavaliação", "Save Self-Review": "Salvar autoavaliação", "Add a story": "Adicionar história", "Edit story": "Editar história", "Cancel": "Cancelar", "Story title": "Título da história", "Competency": "Competência",
  "Situation": "Situação", "Task": "Tarefa", "Action": "Ação", "Result": "Resultado", "Reflection": "Reflexão", "Save Story": "Salvar história", "Update Story": "Atualizar história",
  "Preparation": "Preparação", "Preparation profile": "Perfil de preparação", "Experience level": "Nível de experiência", "Beginner": "Iniciante", "Intermediate": "Intermediário", "Advanced": "Avançado", "Interview date (optional)": "Data da entrevista (opcional)",
  "Target firms (optional)": "Empresas-alvo (opcional)", "Practice sessions per week": "Sessões por semana", "Save Profile": "Salvar perfil", "Update Profile": "Atualizar perfil", "Current snapshot": "Resumo atual", "Weekly sessions": "Sessões semanais", "This week": "Esta semana",
  "Integrated Practice": "Prática integrada", "Case stages": "Etapas do caso", "Stage {number}": "Etapa {number}", "Structure": "Estrutura", "Exhibit and math": "Gráfico e cálculo", "Brainstorm": "Ideias", "Synthesize": "Sintetizar", "Previous Stage": "Etapa anterior", "Continue to {stage}": "Continuar para {stage}",
  "Open the case": "Abrir o caso", "Read the exhibit and calculate": "Ler o gráfico e calcular", "Close the case": "Concluir o caso", "Case complete": "Caso concluído", "Integrated case review": "Revisão integrada do caso", "Retry Full Case": "Tentar caso completo novamente", "Not Saved": "Não salvo", "Saving": "Salvando"
});

Object.assign(zhHans, {
  "Structured Brainstorming": "结构化头脑风暴", "Build your answer": "构建你的回答", "Optional reflection note": "可选反思笔记",
  "Ideas {selected}/{total}": "想法 {selected}/{total}", "Priorities {selected}/{total}": "优先项 {selected}/{total}", "Include {idea}": "纳入 {idea}", "Prioritize {idea}": "优先考虑 {idea}",
  "Brainstorming score": "头脑风暴得分", "Prioritization": "优先级判断", "Relevant ideas missed": "遗漏的相关想法", "Save status": "保存状态",
  "Practice case": "练习案例", "Your task:": "你的任务：", "1. Choose an initial hypothesis": "1. 选择初始假设", "2. Build the issue tree": "2. 构建议题树",
  "Hypothesis": "假设", "Issue tree": "议题树", "Completed": "已完成", "Structure review": "结构复盘", "Covered": "已覆盖", "Missed": "未覆盖", "Retry Case": "重试案例",
  "Case prompt": "案例题目", "Case evidence": "案例证据", "Score Response": "为回答评分", "Response Scored": "回答已评分", "Clear Response": "清除回答", "Response review": "回答复盘", "Model close": "参考结论",
  "Lesson Progress": "课程进度", "Mastered": "已掌握", "Open": "打开", "Core Principle": "核心原则", "Worked Example": "示例解析", "Local save": "本地保存", "Saved on this device": "已保存在此设备",
  "Saved stories": "已保存的故事", "Edit": "编辑", "Rehearse": "演练", "Delete": "删除", "Timed Rehearsal": "限时演练", "Story": "故事", "Answer time": "回答时间", "Finish Answer": "结束回答", "Rehearse Again": "再次演练",
  "Self-review checklist": "自评清单", "Save Self-Review": "保存自评", "Add a story": "添加故事", "Edit story": "编辑故事", "Cancel": "取消", "Story title": "故事标题", "Competency": "能力项",
  "Situation": "情境", "Task": "任务", "Action": "行动", "Result": "结果", "Reflection": "反思", "Save Story": "保存故事", "Update Story": "更新故事",
  "Preparation": "准备", "Preparation profile": "准备资料", "Experience level": "经验水平", "Beginner": "初级", "Intermediate": "中级", "Advanced": "高级", "Interview date (optional)": "面试日期（可选）",
  "Target firms (optional)": "目标公司（可选）", "Practice sessions per week": "每周练习次数", "Save Profile": "保存资料", "Update Profile": "更新资料", "Current snapshot": "当前概览", "Weekly sessions": "每周练习", "This week": "本周",
  "Integrated Practice": "综合练习", "Case stages": "案例阶段", "Stage {number}": "阶段 {number}", "Structure": "结构", "Exhibit and math": "图表与计算", "Brainstorm": "构思想法", "Synthesize": "总结", "Previous Stage": "上一阶段", "Continue to {stage}": "继续到{stage}",
  "Open the case": "开始案例", "Read the exhibit and calculate": "阅读图表并计算", "Close the case": "完成结论", "Case complete": "案例已完成", "Integrated case review": "综合案例复盘", "Retry Full Case": "重试完整案例", "Not Saved": "未保存", "Saving": "正在保存"
});

Object.assign(zhHant, {
  "Structured Brainstorming": "結構化腦力激盪", "Build your answer": "建構你的回答", "Optional reflection note": "選填反思筆記",
  "Ideas {selected}/{total}": "想法 {selected}/{total}", "Priorities {selected}/{total}": "優先項 {selected}/{total}", "Include {idea}": "納入 {idea}", "Prioritize {idea}": "優先考慮 {idea}",
  "Brainstorming score": "腦力激盪得分", "Prioritization": "優先順序判斷", "Relevant ideas missed": "遺漏的相關想法", "Save status": "儲存狀態",
  "Practice case": "練習案例", "Your task:": "你的任務：", "1. Choose an initial hypothesis": "1. 選擇初始假設", "2. Build the issue tree": "2. 建構議題樹",
  "Hypothesis": "假設", "Issue tree": "議題樹", "Completed": "已完成", "Structure review": "結構檢視", "Covered": "已涵蓋", "Missed": "未涵蓋", "Retry Case": "重試案例",
  "Case prompt": "案例題目", "Case evidence": "案例證據", "Score Response": "為回答評分", "Response Scored": "回答已評分", "Clear Response": "清除回答", "Response review": "回答檢視", "Model close": "參考結論",
  "Lesson Progress": "課程進度", "Mastered": "已掌握", "Open": "開啟", "Core Principle": "核心原則", "Worked Example": "範例解析", "Local save": "本機儲存", "Saved on this device": "已儲存在此裝置",
  "Saved stories": "已儲存的故事", "Edit": "編輯", "Rehearse": "演練", "Delete": "刪除", "Timed Rehearsal": "限時演練", "Story": "故事", "Answer time": "回答時間", "Finish Answer": "結束回答", "Rehearse Again": "再次演練",
  "Self-review checklist": "自評清單", "Save Self-Review": "儲存自評", "Add a story": "新增故事", "Edit story": "編輯故事", "Cancel": "取消", "Story title": "故事標題", "Competency": "能力項目",
  "Situation": "情境", "Task": "任務", "Action": "行動", "Result": "結果", "Reflection": "反思", "Save Story": "儲存故事", "Update Story": "更新故事",
  "Preparation": "準備", "Preparation profile": "準備資料", "Experience level": "經驗程度", "Beginner": "初級", "Intermediate": "中級", "Advanced": "高級", "Interview date (optional)": "面試日期（選填）",
  "Target firms (optional)": "目標公司（選填）", "Practice sessions per week": "每週練習次數", "Save Profile": "儲存資料", "Update Profile": "更新資料", "Current snapshot": "目前概覽", "Weekly sessions": "每週練習", "This week": "本週",
  "Integrated Practice": "綜合練習", "Case stages": "案例階段", "Stage {number}": "階段 {number}", "Structure": "結構", "Exhibit and math": "圖表與計算", "Brainstorm": "構思想法", "Synthesize": "總結", "Previous Stage": "上一階段", "Continue to {stage}": "繼續到{stage}",
  "Open the case": "開始案例", "Read the exhibit and calculate": "閱讀圖表並計算", "Close the case": "完成結論", "Case complete": "案例已完成", "Integrated case review": "綜合案例檢視", "Retry Full Case": "重試完整案例", "Not Saved": "未儲存", "Saving": "正在儲存"
});

Object.assign(ja, {
  "Structured Brainstorming": "構造化ブレインストーミング", "Build your answer": "回答を組み立てる", "Optional reflection note": "任意の振り返りメモ",
  "Ideas {selected}/{total}": "アイデア {selected}/{total}", "Priorities {selected}/{total}": "優先項目 {selected}/{total}", "Include {idea}": "{idea}を含める", "Prioritize {idea}": "{idea}を優先する",
  "Brainstorming score": "ブレインストーミングのスコア", "Prioritization": "優先順位付け", "Relevant ideas missed": "見落とした関連アイデア", "Save status": "保存状況",
  "Practice case": "練習ケース", "Your task:": "課題：", "1. Choose an initial hypothesis": "1. 最初の仮説を選ぶ", "2. Build the issue tree": "2. イシューツリーを作る",
  "Hypothesis": "仮説", "Issue tree": "イシューツリー", "Completed": "完了", "Structure review": "構造レビュー", "Covered": "カバー済み", "Missed": "未カバー", "Retry Case": "ケースを再試行",
  "Case prompt": "ケース問題", "Case evidence": "ケースの根拠", "Score Response": "回答を採点", "Response Scored": "回答を採点済み", "Clear Response": "回答を消去", "Response review": "回答レビュー", "Model close": "模範的なまとめ",
  "Lesson Progress": "レッスンの進捗", "Mastered": "習得済み", "Open": "開く", "Core Principle": "重要原則", "Worked Example": "例題", "Local save": "ローカル保存", "Saved on this device": "この端末に保存済み",
  "Saved stories": "保存済みストーリー", "Edit": "編集", "Rehearse": "練習", "Delete": "削除", "Timed Rehearsal": "時間制練習", "Story": "ストーリー", "Answer time": "回答時間", "Finish Answer": "回答を終了", "Rehearse Again": "もう一度練習",
  "Self-review checklist": "自己評価チェックリスト", "Save Self-Review": "自己評価を保存", "Add a story": "ストーリーを追加", "Edit story": "ストーリーを編集", "Cancel": "キャンセル", "Story title": "ストーリーの題名", "Competency": "能力項目",
  "Situation": "状況", "Task": "課題", "Action": "行動", "Result": "結果", "Reflection": "振り返り", "Save Story": "ストーリーを保存", "Update Story": "ストーリーを更新",
  "Preparation": "準備", "Preparation profile": "準備プロフィール", "Experience level": "経験レベル", "Beginner": "初級", "Intermediate": "中級", "Advanced": "上級", "Interview date (optional)": "面接日（任意）",
  "Target firms (optional)": "志望企業（任意）", "Practice sessions per week": "週あたりの練習回数", "Save Profile": "プロフィールを保存", "Update Profile": "プロフィールを更新", "Current snapshot": "現在の概要", "Weekly sessions": "週間セッション", "This week": "今週",
  "Integrated Practice": "統合練習", "Case stages": "ケースの段階", "Stage {number}": "ステージ {number}", "Structure": "構造", "Exhibit and math": "図表と計算", "Brainstorm": "アイデア", "Synthesize": "まとめ", "Previous Stage": "前のステージ", "Continue to {stage}": "{stage}へ進む",
  "Open the case": "ケースを開始", "Read the exhibit and calculate": "図表を読み計算する", "Close the case": "ケースをまとめる", "Case complete": "ケース完了", "Integrated case review": "統合ケースレビュー", "Retry Full Case": "フルケースを再試行", "Not Saved": "未保存", "Saving": "保存中"
});

Object.assign(ar, {
  "Structured Brainstorming": "عصف ذهني منظّم", "Build your answer": "ابنِ إجابتك", "Optional reflection note": "ملاحظة تأمل اختيارية",
  "Ideas {selected}/{total}": "الأفكار {selected}/{total}", "Priorities {selected}/{total}": "الأولويات {selected}/{total}", "Include {idea}": "تضمين {idea}", "Prioritize {idea}": "إعطاء الأولوية لـ {idea}",
  "Brainstorming score": "نتيجة العصف الذهني", "Prioritization": "تحديد الأولويات", "Relevant ideas missed": "أفكار ذات صلة فاتتك", "Save status": "حالة الحفظ",
  "Practice case": "حالة تدريبية", "Your task:": "مهمتك:", "1. Choose an initial hypothesis": "1. اختر فرضية أولية", "2. Build the issue tree": "2. أنشئ شجرة القضايا",
  "Hypothesis": "الفرضية", "Issue tree": "شجرة القضايا", "Completed": "مكتمل", "Structure review": "مراجعة الهيكل", "Covered": "مغطى", "Missed": "غير مغطى", "Retry Case": "إعادة الحالة",
  "Case prompt": "مسألة الحالة", "Case evidence": "أدلة الحالة", "Score Response": "تقييم الإجابة", "Response Scored": "تم تقييم الإجابة", "Clear Response": "مسح الإجابة", "Response review": "مراجعة الإجابة", "Model close": "الخاتمة النموذجية",
  "Lesson Progress": "تقدم الدروس", "Mastered": "متقن", "Open": "فتح", "Core Principle": "المبدأ الأساسي", "Worked Example": "مثال محلول", "Local save": "حفظ محلي", "Saved on this device": "محفوظ على هذا الجهاز",
  "Saved stories": "القصص المحفوظة", "Edit": "تعديل", "Rehearse": "تدرّب", "Delete": "حذف", "Timed Rehearsal": "تدريب موقّت", "Story": "القصة", "Answer time": "وقت الإجابة", "Finish Answer": "إنهاء الإجابة", "Rehearse Again": "التدرّب مجددًا",
  "Self-review checklist": "قائمة المراجعة الذاتية", "Save Self-Review": "حفظ المراجعة الذاتية", "Add a story": "إضافة قصة", "Edit story": "تعديل القصة", "Cancel": "إلغاء", "Story title": "عنوان القصة", "Competency": "الكفاءة",
  "Situation": "الموقف", "Task": "المهمة", "Action": "الإجراء", "Result": "النتيجة", "Reflection": "التأمل", "Save Story": "حفظ القصة", "Update Story": "تحديث القصة",
  "Preparation": "التحضير", "Preparation profile": "ملف التحضير", "Experience level": "مستوى الخبرة", "Beginner": "مبتدئ", "Intermediate": "متوسط", "Advanced": "متقدم", "Interview date (optional)": "تاريخ المقابلة (اختياري)",
  "Target firms (optional)": "الشركات المستهدفة (اختياري)", "Practice sessions per week": "جلسات التدريب أسبوعيًا", "Save Profile": "حفظ الملف", "Update Profile": "تحديث الملف", "Current snapshot": "الملخص الحالي", "Weekly sessions": "الجلسات الأسبوعية", "This week": "هذا الأسبوع",
  "Integrated Practice": "تدريب متكامل", "Case stages": "مراحل الحالة", "Stage {number}": "المرحلة {number}", "Structure": "الهيكل", "Exhibit and math": "الرسم والحساب", "Brainstorm": "الأفكار", "Synthesize": "الخلاصة", "Previous Stage": "المرحلة السابقة", "Continue to {stage}": "المتابعة إلى {stage}",
  "Open the case": "بدء الحالة", "Read the exhibit and calculate": "قراءة الرسم والحساب", "Close the case": "اختتام الحالة", "Case complete": "اكتملت الحالة", "Integrated case review": "مراجعة الحالة المتكاملة", "Retry Full Case": "إعادة الحالة الكاملة", "Not Saved": "غير محفوظ", "Saving": "جارٍ الحفظ"
});

Object.assign(hi, {
  "Structured Brainstorming": "संरचित विचार-मंथन", "Build your answer": "अपना उत्तर बनाएँ", "Optional reflection note": "वैकल्पिक चिंतन नोट",
  "Ideas {selected}/{total}": "विचार {selected}/{total}", "Priorities {selected}/{total}": "प्राथमिकताएँ {selected}/{total}", "Include {idea}": "{idea} शामिल करें", "Prioritize {idea}": "{idea} को प्राथमिकता दें",
  "Brainstorming score": "विचार-मंथन स्कोर", "Prioritization": "प्राथमिकता निर्धारण", "Relevant ideas missed": "छूटे हुए प्रासंगिक विचार", "Save status": "सहेजने की स्थिति",
  "Practice case": "अभ्यास केस", "Your task:": "आपका कार्य:", "1. Choose an initial hypothesis": "1. प्रारंभिक परिकल्पना चुनें", "2. Build the issue tree": "2. इश्यू ट्री बनाएँ",
  "Hypothesis": "परिकल्पना", "Issue tree": "इश्यू ट्री", "Completed": "पूर्ण", "Structure review": "संरचना समीक्षा", "Covered": "शामिल", "Missed": "छूटा", "Retry Case": "केस फिर करें",
  "Case prompt": "केस प्रश्न", "Case evidence": "केस प्रमाण", "Score Response": "उत्तर को अंक दें", "Response Scored": "उत्तर अंकित", "Clear Response": "उत्तर साफ़ करें", "Response review": "उत्तर समीक्षा", "Model close": "आदर्श निष्कर्ष",
  "Lesson Progress": "पाठ प्रगति", "Mastered": "निपुण", "Open": "खोलें", "Core Principle": "मुख्य सिद्धांत", "Worked Example": "हल किया उदाहरण", "Local save": "स्थानीय सहेजना", "Saved on this device": "इस डिवाइस पर सहेजा गया",
  "Saved stories": "सहेजी कहानियाँ", "Edit": "संपादित करें", "Rehearse": "अभ्यास करें", "Delete": "हटाएँ", "Timed Rehearsal": "समयबद्ध अभ्यास", "Story": "कहानी", "Answer time": "उत्तर समय", "Finish Answer": "उत्तर समाप्त करें", "Rehearse Again": "फिर अभ्यास करें",
  "Self-review checklist": "स्व-समीक्षा सूची", "Save Self-Review": "स्व-समीक्षा सहेजें", "Add a story": "कहानी जोड़ें", "Edit story": "कहानी संपादित करें", "Cancel": "रद्द करें", "Story title": "कहानी का शीर्षक", "Competency": "योग्यता",
  "Situation": "स्थिति", "Task": "कार्य", "Action": "कार्रवाई", "Result": "परिणाम", "Reflection": "चिंतन", "Save Story": "कहानी सहेजें", "Update Story": "कहानी अपडेट करें",
  "Preparation": "तैयारी", "Preparation profile": "तैयारी प्रोफ़ाइल", "Experience level": "अनुभव स्तर", "Beginner": "शुरुआती", "Intermediate": "मध्यम", "Advanced": "उन्नत", "Interview date (optional)": "साक्षात्कार तिथि (वैकल्पिक)",
  "Target firms (optional)": "लक्षित फर्म (वैकल्पिक)", "Practice sessions per week": "प्रति सप्ताह अभ्यास सत्र", "Save Profile": "प्रोफ़ाइल सहेजें", "Update Profile": "प्रोफ़ाइल अपडेट करें", "Current snapshot": "वर्तमान सारांश", "Weekly sessions": "साप्ताहिक सत्र", "This week": "इस सप्ताह",
  "Integrated Practice": "समेकित अभ्यास", "Case stages": "केस चरण", "Stage {number}": "चरण {number}", "Structure": "संरचना", "Exhibit and math": "चार्ट और गणना", "Brainstorm": "विचार", "Synthesize": "निष्कर्ष", "Previous Stage": "पिछला चरण", "Continue to {stage}": "{stage} पर जाएँ",
  "Open the case": "केस शुरू करें", "Read the exhibit and calculate": "चार्ट पढ़ें और गणना करें", "Close the case": "केस समाप्त करें", "Case complete": "केस पूर्ण", "Integrated case review": "समेकित केस समीक्षा", "Retry Full Case": "पूरा केस फिर करें", "Not Saved": "सहेजा नहीं गया", "Saving": "सहेजा जा रहा है"
});


export const casePracticeMessages = {
  en: {}, es, fr, de, pt,
  "zh-Hans": zhHans, "zh-Hant": zhHant, ja, ar, hi
} satisfies PartialMessageCatalog;
