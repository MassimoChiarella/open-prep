import type { PartialMessageCatalog } from "@/features/i18n/i18n";

const es = {
  "Guided Market Sizing": "Dimensionamiento de mercado guiado", "Advanced Practice": "Práctica avanzada",
  "Work from assumptions to a scored answer.": "Pasa de los supuestos a una respuesta puntuada.", "Prompt": "Enunciado",
  "Assumptions": "Supuestos", "Calculation": "Cálculo", "Final Answer": "Respuesta final", "Sense-Check And Review": "Comprobación y revisión",
  "Step 1 of 4": "Paso 1 de 4", "Step 2 of 4": "Paso 2 de 4", "Step 3 of 4": "Paso 3 de 4", "Step 4 of 4": "Paso 4 de 4",
  "Continue to Calculation": "Continuar al cálculo", "Continue to Final Answer": "Continuar a la respuesta final", "Continue to Review": "Continuar a la revisión",
  "Back to Assumptions": "Volver a supuestos", "Back to Calculation": "Volver al cálculo", "Back to Final Answer": "Volver a la respuesta final",
  "Required": "Obligatorio", "Completed": "Completado", "Select option": "Seleccionar opción", "Required Assumption Progress": "Progreso de supuestos obligatorios",
  "{completed}/{total} required": "{completed}/{total} obligatorios", "{percent} complete": "{percent} completado",
  "All required assumptions are filled.": "Todos los supuestos obligatorios están completos.", "Next required field: {field}.": "Siguiente campo obligatorio: {field}.",
  "Expected range:": "Rango esperado:", "Entered:": "Introducido:", "No expected range set for this assumption.": "No hay un rango esperado para este supuesto.",
  "Calculated Result": "Resultado calculado", "Complete numeric assumptions to calculate.": "Completa los supuestos numéricos para calcular.", "Formula Inputs": "Entradas de la fórmula",
  "Missing": "Falta", "Formula": "Fórmula", "Final answer ({unit})": "Respuesta final ({unit})", "Interpretation": "Interpretación",
  "Select interpretation": "Seleccionar interpretación", "Notes": "Notas", "Optional self-review note": "Nota opcional de autoevaluación",
  "Score Draft": "Puntuar borrador", "Score Again": "Puntuar de nuevo", "Reset": "Restablecer", "Saving...": "Guardando...",
  "Save status": "Estado de guardado", "Saved on this device": "Guardado en este dispositivo", "Score {score}/{max} saved on this device.": "Puntuación {score}/{max} guardada en este dispositivo.",
  "Could not save this market sizing attempt on this device.": "No se pudo guardar este intento de dimensionamiento en este dispositivo.",
  "Unable to score this draft.": "No se pudo puntuar este borrador.", "Market sizing progress": "Progreso del dimensionamiento",
  "Current": "Actual", "Complete": "Completado", "Upcoming": "Próximo", "Type": "Tipo", "Difficulty": "Dificultad", "Industry": "Sector", "Output": "Resultado",
  "Score": "Puntuación", "Ranges": "Rangos", "Sense-check": "Comprobación", "{inRange}/{total} in range": "{inRange}/{total} dentro del rango",
  "Not checked yet": "Aún sin comprobar", "Rubric Score": "Puntuación de la rúbrica", "{score}/{max} pts": "{score}/{max} pts",
  "Scoring separates structure, assumptions, math, units, sense-check, and interpretation.": "La puntuación separa estructura, supuestos, cálculo, unidades, comprobación e interpretación.",
  "All rubric areas complete": "Todas las áreas de la rúbrica completas", "{count} rubric areas need work": "{count} áreas de la rúbrica necesitan mejorar",
  "Market sizing prompts are unavailable.": "Los ejercicios de dimensionamiento no están disponibles.",
  "Market sizing prompts could not be loaded. Use a drill or exhibit while this area is unavailable.": "No se pudieron cargar los ejercicios de dimensionamiento. Usa un ejercicio o gráfico mientras esta sección no esté disponible.",
  "Start Drill": "Iniciar ejercicio", "Try Exhibits": "Probar gráficos", "Loading market-sizing practice...": "Cargando práctica de dimensionamiento...",
  "Unavailable": "No disponible", "{min} to {max}": "{min} a {max}", "60% or 0.6": "60 % o 0,6",
  "Complete numeric assumptions to calculate the expected answer.": "Completa los supuestos numéricos para calcular la respuesta esperada.",
  "Enter a final answer to compare.": "Introduce una respuesta final para comparar.", "Final answer matches the calculated result.": "La respuesta final coincide con el resultado calculado.",
  "Not part of the calculation.": "No forma parte del cálculo.", "Enter an assumption.": "Introduce un supuesto.", "Enter a valid number.": "Introduce un número válido.",
  "In range.": "Dentro del rango.", "Outside range.": "Fuera del rango.", "Final answer unit is acceptable.": "La unidad de la respuesta final es válida.",
  "Final answer unit is missing or incorrect.": "La unidad de la respuesta final falta o es incorrecta.", "Sense-check completed.": "Comprobación completada.",
  "Sense-check is not complete.": "La comprobación no está completa.", "Interpretation or self-review note captured.": "Interpretación o nota de autoevaluación registrada.",
  "Select an interpretation or add a self-review note.": "Selecciona una interpretación o añade una nota de autoevaluación.",
  "{completed}/{total} required fields completed.": "{completed}/{total} campos obligatorios completados.",
  "{inRange}/{total} ranged assumptions are in range.": "{inRange}/{total} supuestos están dentro del rango.",
  "Bottom Up": "De abajo arriba", "Top Down": "De arriba abajo", "Hybrid": "Híbrido", "Beginner": "Principiante", "Intermediate": "Intermedio", "Advanced": "Avanzado",
  "Currency": "Moneda", "Percentage": "Porcentaje", "Units": "Unidades", "People": "Personas", "Structure": "Estructura", "Math": "Cálculo", "Sense Check": "Comprobación"
};

const fr = { "Guided Market Sizing": "Dimensionnement de marché guidé", "Assumptions": "Hypothèses", "Calculation": "Calcul", "Final Answer": "Réponse finale", "Prompt": "Énoncé", "Required": "Obligatoire", "Completed": "Terminé", "Continue to Calculation": "Continuer vers le calcul", "Continue to Final Answer": "Continuer vers la réponse finale", "Continue to Review": "Continuer vers la révision", "Back to Assumptions": "Retour aux hypothèses", "Interpretation": "Interprétation", "Score Draft": "Évaluer le brouillon", "Reset": "Réinitialiser", "Saving...": "Enregistrement...", "Saved on this device": "Enregistré sur cet appareil", "Difficulty": "Difficulté", "Industry": "Secteur", "Score": "Score", "Ranges": "Plages", "Unavailable": "Indisponible" };
const de = { "Guided Market Sizing": "Geführte Marktgrößenschätzung", "Assumptions": "Annahmen", "Calculation": "Berechnung", "Final Answer": "Endergebnis", "Prompt": "Aufgabe", "Required": "Erforderlich", "Completed": "Abgeschlossen", "Continue to Calculation": "Weiter zur Berechnung", "Continue to Final Answer": "Weiter zum Endergebnis", "Continue to Review": "Weiter zur Auswertung", "Back to Assumptions": "Zurück zu den Annahmen", "Interpretation": "Interpretation", "Score Draft": "Entwurf bewerten", "Reset": "Zurücksetzen", "Saving...": "Wird gespeichert...", "Saved on this device": "Auf diesem Gerät gespeichert", "Difficulty": "Schwierigkeit", "Industry": "Branche", "Score": "Punktzahl", "Ranges": "Bandbreiten", "Unavailable": "Nicht verfügbar" };
const pt = { "Guided Market Sizing": "Dimensionamento de mercado guiado", "Assumptions": "Premissas", "Calculation": "Cálculo", "Final Answer": "Resposta final", "Prompt": "Enunciado", "Required": "Obrigatório", "Completed": "Concluído", "Continue to Calculation": "Continuar para o cálculo", "Continue to Final Answer": "Continuar para a resposta final", "Continue to Review": "Continuar para a revisão", "Back to Assumptions": "Voltar às premissas", "Interpretation": "Interpretação", "Score Draft": "Pontuar rascunho", "Reset": "Redefinir", "Saving...": "Salvando...", "Saved on this device": "Salvo neste dispositivo", "Difficulty": "Dificuldade", "Industry": "Setor", "Score": "Pontuação", "Ranges": "Faixas", "Unavailable": "Indisponível" };
const zhHans = { "Guided Market Sizing": "引导式市场规模估算", "Assumptions": "假设", "Calculation": "计算", "Final Answer": "最终答案", "Prompt": "题目", "Required": "必填", "Completed": "已完成", "Continue to Calculation": "继续计算", "Continue to Final Answer": "继续填写最终答案", "Continue to Review": "继续复盘", "Back to Assumptions": "返回假设", "Interpretation": "解读", "Score Draft": "为草稿评分", "Reset": "重置", "Saving...": "正在保存...", "Saved on this device": "已保存在此设备", "Difficulty": "难度", "Industry": "行业", "Score": "得分", "Ranges": "范围", "Unavailable": "不可用" };
const zhHant = { "Guided Market Sizing": "引導式市場規模估算", "Assumptions": "假設", "Calculation": "計算", "Final Answer": "最終答案", "Prompt": "題目", "Required": "必填", "Completed": "已完成", "Continue to Calculation": "繼續計算", "Continue to Final Answer": "繼續填寫最終答案", "Continue to Review": "繼續檢視", "Back to Assumptions": "返回假設", "Interpretation": "解讀", "Score Draft": "為草稿評分", "Reset": "重設", "Saving...": "正在儲存...", "Saved on this device": "已儲存在此裝置", "Difficulty": "難度", "Industry": "產業", "Score": "得分", "Ranges": "範圍", "Unavailable": "不可用" };
const ja = { "Guided Market Sizing": "市場規模推定ガイド", "Assumptions": "前提", "Calculation": "計算", "Final Answer": "最終回答", "Prompt": "問題", "Required": "必須", "Completed": "完了", "Continue to Calculation": "計算へ進む", "Continue to Final Answer": "最終回答へ進む", "Continue to Review": "レビューへ進む", "Back to Assumptions": "前提に戻る", "Interpretation": "解釈", "Score Draft": "下書きを採点", "Reset": "リセット", "Saving...": "保存中...", "Saved on this device": "この端末に保存済み", "Difficulty": "難易度", "Industry": "業界", "Score": "スコア", "Ranges": "範囲", "Unavailable": "利用不可" };
const ar = { "Guided Market Sizing": "تقدير موجّه لحجم السوق", "Assumptions": "الافتراضات", "Calculation": "الحساب", "Final Answer": "الإجابة النهائية", "Prompt": "المسألة", "Required": "مطلوب", "Completed": "مكتمل", "Continue to Calculation": "المتابعة إلى الحساب", "Continue to Final Answer": "المتابعة إلى الإجابة النهائية", "Continue to Review": "المتابعة إلى المراجعة", "Back to Assumptions": "العودة إلى الافتراضات", "Interpretation": "التفسير", "Score Draft": "تقييم المسودة", "Reset": "إعادة تعيين", "Saving...": "جارٍ الحفظ...", "Saved on this device": "محفوظ على هذا الجهاز", "Difficulty": "الصعوبة", "Industry": "القطاع", "Score": "النتيجة", "Ranges": "النطاقات", "Unavailable": "غير متاح" };
const hi = { "Guided Market Sizing": "निर्देशित बाज़ार आकार अनुमान", "Assumptions": "मान्यताएँ", "Calculation": "गणना", "Final Answer": "अंतिम उत्तर", "Prompt": "प्रश्न", "Required": "आवश्यक", "Completed": "पूर्ण", "Continue to Calculation": "गणना पर जाएँ", "Continue to Final Answer": "अंतिम उत्तर पर जाएँ", "Continue to Review": "समीक्षा पर जाएँ", "Back to Assumptions": "मान्यताओं पर लौटें", "Interpretation": "व्याख्या", "Score Draft": "मसौदे को अंक दें", "Reset": "रीसेट", "Saving...": "सहेजा जा रहा है...", "Saved on this device": "इस डिवाइस पर सहेजा गया", "Difficulty": "कठिनाई", "Industry": "उद्योग", "Score": "स्कोर", "Ranges": "सीमाएँ", "Unavailable": "अनुपलब्ध" };


export const marketSizingMessages = {
  en: {}, es, fr, de, pt,
  "zh-Hans": zhHans, "zh-Hant": zhHant, ja, ar, hi
} satisfies PartialMessageCatalog;
