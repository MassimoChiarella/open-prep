import type { PartialMessageCatalog } from "@/features/i18n/i18n";

const es = {
  "Exhibit": "Gráfico", "Question": "Pregunta", "Exhibit Question": "Pregunta del gráfico", "Answer": "Respuesta",
  "Answer controls": "Controles de respuesta", "Submit Answer": "Enviar respuesta", "Clear": "Borrar", "Solution": "Solución",
  "Correct": "Correcto", "Incorrect": "Incorrecto", "Timed out": "Tiempo agotado", "Untimed": "Sin límite de tiempo",
  "Correct answer: {answer}": "Respuesta correcta: {answer}", "Enter an answer before submitting.": "Introduce una respuesta antes de enviarla.",
  "Correct. Attempt saved on this device.": "Correcto. El intento se guardó en este dispositivo.",
  "{feedback} Attempt saved on this device.": "{feedback} El intento se guardó en este dispositivo.",
  "{feedback} The attempt could not be saved on this device.": "{feedback} El intento no se pudo guardar en este dispositivo.",
  "Answer checked, but the attempt could not be saved on this device.": "La respuesta se comprobó, pero el intento no se pudo guardar en este dispositivo.",
  "Dataset details": "Detalles del conjunto de datos", "Type": "Tipo", "Rows": "Filas", "Questions": "Preguntas",
  "Unit": "Unidad", "Dimensions": "Dimensiones", "Metrics": "Métricas", "Series": "Series", "Legend": "Leyenda",
  "Increase": "Aumento", "Decrease": "Disminución", "Total": "Total", "Colors show categories.": "Los colores muestran categorías.",
  "Colors show movement direction and totals.": "Los colores muestran la dirección del cambio y los totales.",
  "Colors show plotted series.": "Los colores muestran las series representadas.", "Table Exhibit": "Tabla",
  "Scroll chart sideways to inspect axis labels.": "Desplaza el gráfico horizontalmente para ver las etiquetas de los ejes.",
  "Scroll table sideways to compare all columns.": "Desplaza la tabla horizontalmente para comparar todas las columnas.",
  "Exhibit questions are unavailable.": "Las preguntas de gráficos no están disponibles.",
  "Exhibit datasets could not be loaded. Use a drill while this area is unavailable.": "No se pudieron cargar los conjuntos de datos. Usa un ejercicio mientras esta sección no esté disponible.",
  "Start Drill": "Iniciar ejercicio", "Save status": "Estado de guardado", "Saving...": "Guardando...",
  "Exhibit Sprint": "Sprint de gráficos", "Timed Practice": "Práctica cronometrada", "Start Exhibit Sprint": "Iniciar sprint de gráficos",
  "Return to Exhibit Practice": "Volver a práctica de gráficos", "Practice Individual Exhibits": "Practicar gráficos individuales",
  "Choose sprint length": "Elige la duración del sprint", "Complete three to five exhibit questions against a per-question countdown.": "Completa de tres a cinco preguntas con una cuenta atrás por pregunta.",
  "Each question uses its own countdown and saves locally.": "Cada pregunta tiene su propia cuenta atrás y se guarda localmente.",
  "At least three local exhibit questions are required.": "Se requieren al menos tres preguntas locales.",
  "Exhibit Sprint is unavailable": "El sprint de gráficos no está disponible", "Question {current} of {total}": "Pregunta {current} de {total}",
  "{duration} remaining": "Quedan {duration}", "{duration} target": "Objetivo: {duration}", "Timed exhibit": "Gráfico cronometrado",
  "Next Question": "Siguiente pregunta", "View Summary": "Ver resumen", "Sprint complete": "Sprint completado",
  "{correct} of {total} correct": "{correct} de {total} correctas", "Accuracy {percent}": "Precisión {percent}",
  "Start Another Sprint": "Iniciar otro sprint", "View Progress": "Ver progreso", "Saving locally...": "Guardando localmente...",
  "Saved on this device": "Guardado en este dispositivo", "Local save unavailable": "Guardado local no disponible",
  "Time expired. Review the answer, then continue.": "Se acabó el tiempo. Revisa la respuesta y continúa.",
  "Loading exhibit practice...": "Cargando práctica de gráficos...", "Category: {label}": "Categoría: {label}",
  "Strategic choice": "Elección estratégica", "Bar Chart": "Gráfico de barras", "Pie Chart": "Gráfico circular",
  "Waterfall": "Cascada", "Scatterplot": "Dispersión", "Stacked Bar": "Barras apiladas", "Index Chart": "Gráfico de índice",
  "Currency": "Moneda", "Percentage": "Porcentaje", "Units": "Unidades", "{title} {chartType}": "{title} {chartType}"
};

const fr = { "Exhibit": "Graphique", "Question": "Question", "Exhibit Question": "Question sur le graphique", "Answer": "Réponse", "Submit Answer": "Valider la réponse", "Clear": "Effacer", "Solution": "Solution", "Correct": "Correct", "Incorrect": "Incorrect", "Dataset details": "Détails du jeu de données", "Rows": "Lignes", "Questions": "Questions", "Dimensions": "Dimensions", "Metrics": "Mesures", "Legend": "Légende", "Start Exhibit Sprint": "Démarrer le sprint de graphiques", "Next Question": "Question suivante", "View Summary": "Voir le résumé", "Saved on this device": "Enregistré sur cet appareil", "Saving...": "Enregistrement...", "View Progress": "Voir la progression" };
const de = { "Exhibit": "Diagramm", "Question": "Frage", "Exhibit Question": "Diagrammfrage", "Answer": "Antwort", "Submit Answer": "Antwort senden", "Clear": "Löschen", "Solution": "Lösung", "Correct": "Richtig", "Incorrect": "Falsch", "Dataset details": "Datensatzdetails", "Rows": "Zeilen", "Questions": "Fragen", "Dimensions": "Dimensionen", "Metrics": "Kennzahlen", "Legend": "Legende", "Start Exhibit Sprint": "Diagramm-Sprint starten", "Next Question": "Nächste Frage", "View Summary": "Zusammenfassung ansehen", "Saved on this device": "Auf diesem Gerät gespeichert", "Saving...": "Wird gespeichert...", "View Progress": "Fortschritt ansehen" };
const pt = { "Exhibit": "Gráfico", "Question": "Pergunta", "Exhibit Question": "Pergunta do gráfico", "Answer": "Resposta", "Submit Answer": "Enviar resposta", "Clear": "Limpar", "Solution": "Solução", "Correct": "Correto", "Incorrect": "Incorreto", "Dataset details": "Detalhes dos dados", "Rows": "Linhas", "Questions": "Perguntas", "Dimensions": "Dimensões", "Metrics": "Métricas", "Legend": "Legenda", "Start Exhibit Sprint": "Iniciar sprint de gráficos", "Next Question": "Próxima pergunta", "View Summary": "Ver resumo", "Saved on this device": "Salvo neste dispositivo", "Saving...": "Salvando...", "View Progress": "Ver progresso" };
const zhHans = { "Exhibit": "图表", "Question": "问题", "Exhibit Question": "图表问题", "Answer": "答案", "Submit Answer": "提交答案", "Clear": "清除", "Solution": "解答", "Correct": "正确", "Incorrect": "错误", "Dataset details": "数据集详情", "Rows": "行", "Questions": "问题", "Dimensions": "维度", "Metrics": "指标", "Legend": "图例", "Start Exhibit Sprint": "开始图表冲刺", "Next Question": "下一题", "View Summary": "查看总结", "Saved on this device": "已保存在此设备", "Saving...": "正在保存...", "View Progress": "查看进度" };
const zhHant = { "Exhibit": "圖表", "Question": "問題", "Exhibit Question": "圖表問題", "Answer": "答案", "Submit Answer": "提交答案", "Clear": "清除", "Solution": "解答", "Correct": "正確", "Incorrect": "錯誤", "Dataset details": "資料集詳情", "Rows": "列", "Questions": "問題", "Dimensions": "維度", "Metrics": "指標", "Legend": "圖例", "Start Exhibit Sprint": "開始圖表衝刺", "Next Question": "下一題", "View Summary": "查看摘要", "Saved on this device": "已儲存在此裝置", "Saving...": "正在儲存...", "View Progress": "查看進度" };
const ja = { "Exhibit": "図表", "Question": "問題", "Exhibit Question": "図表問題", "Answer": "回答", "Submit Answer": "回答を送信", "Clear": "クリア", "Solution": "解答", "Correct": "正解", "Incorrect": "不正解", "Dataset details": "データセットの詳細", "Rows": "行", "Questions": "問題", "Dimensions": "ディメンション", "Metrics": "指標", "Legend": "凡例", "Start Exhibit Sprint": "図表スプリントを開始", "Next Question": "次の問題", "View Summary": "概要を見る", "Saved on this device": "この端末に保存済み", "Saving...": "保存中...", "View Progress": "進捗を見る" };
const ar = { "Exhibit": "الرسم البياني", "Question": "السؤال", "Exhibit Question": "سؤال الرسم البياني", "Answer": "الإجابة", "Submit Answer": "إرسال الإجابة", "Clear": "مسح", "Solution": "الحل", "Correct": "صحيح", "Incorrect": "غير صحيح", "Dataset details": "تفاصيل مجموعة البيانات", "Rows": "الصفوف", "Questions": "الأسئلة", "Dimensions": "الأبعاد", "Metrics": "المقاييس", "Legend": "مفتاح الرسم", "Start Exhibit Sprint": "بدء تمرين الرسوم", "Next Question": "السؤال التالي", "View Summary": "عرض الملخص", "Saved on this device": "محفوظ على هذا الجهاز", "Saving...": "جارٍ الحفظ...", "View Progress": "عرض التقدم" };
const hi = { "Exhibit": "चार्ट", "Question": "प्रश्न", "Exhibit Question": "चार्ट प्रश्न", "Answer": "उत्तर", "Submit Answer": "उत्तर जमा करें", "Clear": "साफ़ करें", "Solution": "समाधान", "Correct": "सही", "Incorrect": "गलत", "Dataset details": "डेटासेट विवरण", "Rows": "पंक्तियाँ", "Questions": "प्रश्न", "Dimensions": "आयाम", "Metrics": "मेट्रिक्स", "Legend": "संकेत", "Start Exhibit Sprint": "चार्ट स्प्रिंट शुरू करें", "Next Question": "अगला प्रश्न", "View Summary": "सारांश देखें", "Saved on this device": "इस डिवाइस पर सहेजा गया", "Saving...": "सहेजा जा रहा है...", "View Progress": "प्रगति देखें" };


export const exhibitMessages = {
  en: {}, es, fr, de, pt,
  "zh-Hans": zhHans, "zh-Hant": zhHant, ja, ar, hi
} satisfies PartialMessageCatalog;
