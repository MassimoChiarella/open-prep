import type {
  ArithmeticDivisionMode,
  ArithmeticDivisionRounding,
  ArithmeticMixedOperator,
  ArithmeticMultiplicationStyle,
  Difficulty,
  DrillSettings,
  Question,
  QuestionTemplate,
  SkillTag,
  UnitType
} from "@/lib/domain";
import { formatNumber } from "@/lib/format";
import type { SeededRandom } from "@/lib/random/seededRandom";

type ArithmeticOperation = Extract<
  SkillTag,
  "addition" | "subtraction" | "multiplication" | "division" | "mixed_operations"
>;
type OperatorSymbol = "+" | "-" | "*" | "/";
type DigitMultiplicationStyle = Extract<
  ArithmeticMultiplicationStyle,
  "single_digit" | "double_digit" | "triple_digit"
>;

interface ArithmeticExpression {
  operators: OperatorSymbol[];
  useParentheses: boolean;
  values: number[];
}

interface ArithmeticResult {
  displayedValue: number;
  explanation?: string;
  instruction?: string;
  prompt?: string;
  roundingRule?: ArithmeticDivisionRounding;
}

const operations: ArithmeticOperation[] = [
  "addition",
  "subtraction",
  "multiplication",
  "division",
  "mixed_operations"
];
const defaultMixedOperators: ArithmeticMixedOperator[] = ["addition", "subtraction", "multiplication"];
const operatorSymbols: Record<ArithmeticMixedOperator, OperatorSymbol> = {
  addition: "+",
  division: "/",
  multiplication: "*",
  subtraction: "-"
};

export function hasCustomArithmeticSettings(settings: DrillSettings): boolean {
  return (
    settings.arithmeticTermCount !== undefined ||
    settings.arithmeticNumberFormat !== undefined ||
    settings.arithmeticOperandSize !== undefined ||
    settings.arithmeticAllowNegatives !== undefined ||
    settings.arithmeticMultiplicationStyle !== undefined ||
    settings.arithmeticDivisionMode !== undefined ||
    settings.arithmeticDivisionRounding !== undefined ||
    settings.arithmeticMixedOperators !== undefined ||
    settings.arithmeticUseParentheses !== undefined ||
    settings.unitPreference !== undefined
  );
}

export function generateCustomArithmeticQuestion(
  template: QuestionTemplate,
  settings: DrillSettings,
  random: SeededRandom
): Question {
  const operation = resolveOperation(template, settings, random);
  const divisionMode = settings.arithmeticDivisionMode ?? "exact";
  const expression = createExpression(operation, settings, divisionMode, random);
  const result = resolveResult(operation, expression, divisionMode, settings.arithmeticDivisionRounding ?? "nearest_0_1");
  const answerUnit = operation === "division" && divisionMode === "remainder" ? "none" : settings.unitPreference ?? "none";
  const answerValue = answerUnit === "percentage" ? result.displayedValue / 100 : result.displayedValue;
  const renderedExpression = renderExpression(expression);
  const hint = hintFor(operation, divisionMode, expression.useParentheses);
  const prompt = result.prompt ?? `What is ${renderedExpression}?`;

  return {
    id: buildQuestionId(template.id, expression, answerUnit, buildVariantKey(settings)),
    type: "numeric",
    category: "arithmetic",
    tags: [operation],
    difficulty: settings.difficulty,
    prompt: `${prompt}${result.instruction === undefined ? "" : ` ${result.instruction}`}${unitPrompt(answerUnit)}`,
    answer: {
      value: answerValue,
      unit: answerUnit,
      ...(result.roundingRule === undefined ? {} : { roundingRule: result.roundingRule })
    },
    explanation: {
      short: hint,
      steps: [
        hint,
        result.explanation ?? `${renderedExpression} = ${formatNumber(result.displayedValue)}.`
      ],
      shortcut: shortcutFor(operation, divisionMode, expression.useParentheses)
    },
    metadata: {
      variables: {
        ...Object.fromEntries(expression.values.map((value, index) => [`term${index + 1}`, value])),
        ...Object.fromEntries(expression.operators.map((operator, index) => [`operator${index + 1}`, operator]))
      },
      sourceType: "generated"
    }
  };
}

function resolveOperation(
  template: QuestionTemplate,
  settings: DrillSettings,
  random: SeededRandom
): ArithmeticOperation {
  const requested = settings.tags?.filter(isArithmeticOperation) ?? [];
  const templateOperation = template.tags.find(isArithmeticOperation);

  return requested.length > 0
    ? random.pick(requested)
    : templateOperation ?? random.pick(operations);
}

function isArithmeticOperation(tag: SkillTag): tag is ArithmeticOperation {
  return operations.includes(tag as ArithmeticOperation);
}

function createExpression(
  operation: ArithmeticOperation,
  settings: DrillSettings,
  divisionMode: ArithmeticDivisionMode,
  random: SeededRandom
): ArithmeticExpression {
  const requestedTermCount = settings.arithmeticTermCount ?? 2;
  const termCount = operation === "division" && divisionMode === "remainder" ? 2 : requestedTermCount;
  const operators = buildOperators(operation, termCount, settings.arithmeticMixedOperators, random);
  const values = createOperands(operation, operators, settings, divisionMode, random);

  return {
    operators,
    useParentheses: operation === "mixed_operations" && settings.arithmeticUseParentheses !== false,
    values
  };
}

function buildOperators(
  operation: ArithmeticOperation,
  termCount: number,
  mixedOperators: ArithmeticMixedOperator[] | undefined,
  random: SeededRandom
): OperatorSymbol[] {
  if (operation === "mixed_operations") {
    const allowed = mixedOperators === undefined || mixedOperators.length === 0 ? defaultMixedOperators : mixedOperators;
    return Array.from({ length: termCount - 1 }, () => operatorSymbols[random.pick(allowed)]);
  }

  const operator = ({
    addition: "+",
    division: "/",
    multiplication: "*",
    subtraction: "-"
  } as const)[operation];

  return Array.from({ length: termCount - 1 }, () => operator);
}

function createOperands(
  operation: ArithmeticOperation,
  operators: OperatorSymbol[],
  settings: DrillSettings,
  divisionMode: ArithmeticDivisionMode,
  random: SeededRandom
): number[] {
  const termCount = operators.length + 1;
  const numberFormat = settings.arithmeticNumberFormat ?? "integer";
  const operandSize = settings.arithmeticOperandSize ?? "medium";
  const allowNegatives = settings.arithmeticAllowNegatives === true;

  if (operation === "division") {
    return createDivisionOperands(
      termCount,
      divisionMode,
      numberFormat,
      operandSize,
      settings.difficulty,
      allowNegatives,
      random
    );
  }

  const operands = Array.from({ length: termCount }, () =>
    operation === "multiplication"
      ? createMultiplicationOperand(
          settings.arithmeticMultiplicationStyle ?? "difficulty_scaled",
          numberFormat,
          operandSize,
          settings.difficulty,
          random
        )
      : createOperand(operation, numberFormat, operandSize, settings.difficulty, random)
  );

  if (operation === "subtraction" && !allowNegatives) {
    operands[0] = roundValue(operands.slice(1).reduce((sum, value) => sum + value, 0) + operands[0]);
  }

  if (allowNegatives) {
    const negativeIndex = random.integer(0, operands.length - 1);
    operands[negativeIndex] = -Math.abs(operands[negativeIndex]);
  }

  return operands;
}

function createDivisionOperands(
  termCount: number,
  mode: ArithmeticDivisionMode,
  numberFormat: NonNullable<DrillSettings["arithmeticNumberFormat"]>,
  operandSize: NonNullable<DrillSettings["arithmeticOperandSize"]>,
  difficulty: Difficulty,
  allowNegatives: boolean,
  random: SeededRandom
): number[] {
  const maxDivisor = { beginner: 12, intermediate: 15, advanced: 20, expert: 25 }[difficulty];

  if (mode === "remainder") {
    const divisor = random.integer(3, maxDivisor);
    const quotient = random.integer(2, maxDivisor * difficultyScale(difficulty));
    const remainder = random.integer(1, divisor - 1);
    return [quotient * divisor + remainder, divisor];
  }

  const quotient = createOperand("division", numberFormat, operandSize, difficulty, random);
  const divisors = Array.from({ length: termCount - 1 }, () =>
    random.integer(2, termCount > 2 ? Math.min(8, maxDivisor) : maxDivisor)
  );
  const divisorProduct = divisors.reduce((product, value) => product * value, 1);
  const offset = mode === "approximate" ? (numberFormat === "integer" ? random.integer(1, divisors[0] - 1) : 0.1) : 0;
  const operands = [roundValue(quotient * divisorProduct + offset), ...divisors];

  if (allowNegatives) {
    operands[random.integer(0, operands.length - 1)] *= -1;
  }

  return operands;
}

function createMultiplicationOperand(
  style: ArithmeticMultiplicationStyle,
  numberFormat: NonNullable<DrillSettings["arithmeticNumberFormat"]>,
  operandSize: NonNullable<DrillSettings["arithmeticOperandSize"]>,
  difficulty: Difficulty,
  random: SeededRandom
): number {
  if (style === "difficulty_scaled") {
    return createOperand("multiplication", numberFormat, operandSize, difficulty, random);
  }

  if (!isDigitMultiplicationStyle(style)) {
    const multiple = Number(style.replace("multiple_", ""));
    const stepRanges = { small: [1, 4], medium: [2, 12], large: [5, 30] } as const;
    const [minStep, maxStep] = stepRanges[operandSize];
    return random.integer(minStep, maxStep * difficultyScale(difficulty)) * multiple;
  }

  const ranges = {
    double_digit: [10, 99],
    single_digit: [2, 9],
    triple_digit: [100, 999]
  } as const;
  const [min, max] = ranges[style];
  const difficultyFloor = { beginner: 0, intermediate: 0.2, advanced: 0.5, expert: 0.75 }[difficulty];
  const scaledMin = Math.ceil(min + (max - min) * difficultyFloor);

  return createNumberInRange(scaledMin, max, numberFormat, difficulty, random);
}

function isDigitMultiplicationStyle(style: ArithmeticMultiplicationStyle): style is DigitMultiplicationStyle {
  return style === "single_digit" || style === "double_digit" || style === "triple_digit";
}

function createOperand(
  operation: ArithmeticOperation,
  numberFormat: NonNullable<DrillSettings["arithmeticNumberFormat"]>,
  operandSize: NonNullable<DrillSettings["arithmeticOperandSize"]>,
  difficulty: Difficulty,
  random: SeededRandom
): number {
  const additiveRanges = { small: [2, 20], medium: [20, 200], large: [200, 2_000] } as const;
  const factorRanges = { small: [2, 12], medium: [5, 40], large: [10, 125] } as const;
  const [baseMin, baseMax] =
    operation === "multiplication" || operation === "division"
      ? factorRanges[operandSize]
      : additiveRanges[operandSize];
  const scale = difficultyScale(difficulty);

  return createNumberInRange(baseMin * scale, baseMax * scale, numberFormat, difficulty, random);
}

function createNumberInRange(
  min: number,
  max: number,
  numberFormat: NonNullable<DrillSettings["arithmeticNumberFormat"]>,
  difficulty: Difficulty,
  random: SeededRandom
): number {
  if (numberFormat === "integer") {
    return random.integer(min, max);
  }

  const precision = difficulty === "advanced" || difficulty === "expert" ? 100 : 10;
  let scaled = random.integer(min * precision, max * precision);

  if (scaled % precision === 0) {
    scaled += scaled < max * precision ? 1 : -1;
  }

  return scaled / precision;
}

function resolveResult(
  operation: ArithmeticOperation,
  expression: ArithmeticExpression,
  divisionMode: ArithmeticDivisionMode,
  divisionRounding: ArithmeticDivisionRounding
): ArithmeticResult {
  if (operation === "division" && divisionMode === "remainder") {
    const [dividend, divisor] = expression.values;
    const quotient = Math.floor(dividend / divisor);
    const remainder = dividend % divisor;

    return {
      displayedValue: remainder,
      explanation: `${formatNumber(dividend)} = ${formatNumber(divisor)} x ${formatNumber(quotient)} + ${formatNumber(remainder)}, so the remainder is ${formatNumber(remainder)}.`,
      prompt: `What is the remainder when ${formatOperand(dividend)} is divided by ${formatOperand(divisor)}?`
    };
  }

  const rawValue = calculateExpression(expression);

  if (operation === "division" && divisionMode === "approximate") {
    const displayedValue = roundForRule(rawValue, divisionRounding);
    return {
      displayedValue,
      explanation: `${renderExpression(expression)} = ${formatNumber(rawValue)}, which rounds to ${formatNumber(displayedValue)}.`,
      instruction: roundingInstruction(divisionRounding),
      roundingRule: divisionRounding
    };
  }

  if (operation === "mixed_operations" && expression.operators.includes("/")) {
    const displayedValue = roundForRule(rawValue, "nearest_0_1");
    return {
      displayedValue,
      explanation: `${renderExpression(expression)} = ${formatNumber(rawValue)}, which rounds to ${formatNumber(displayedValue)}.`,
      instruction: roundingInstruction("nearest_0_1"),
      roundingRule: "nearest_0_1"
    };
  }

  return { displayedValue: roundValue(rawValue) };
}

function calculateExpression(expression: ArithmeticExpression): number {
  if (expression.useParentheses) {
    return roundValue(
      expression.operators.reduce(
        (result, operator, index) => applyOperator(result, operator, expression.values[index + 1]),
        expression.values[0]
      )
    );
  }

  let total = 0;
  let current = expression.values[0];

  for (let index = 0; index < expression.operators.length; index += 1) {
    const operator = expression.operators[index];
    const next = expression.values[index + 1];

    if (operator === "*" || operator === "/") {
      current = applyOperator(current, operator, next);
    } else {
      total += current;
      current = operator === "+" ? next : -next;
    }
  }

  return roundValue(total + current);
}

function applyOperator(left: number, operator: OperatorSymbol, right: number): number {
  if (operator === "+") return left + right;
  if (operator === "-") return left - right;
  if (operator === "*") return left * right;
  return left / right;
}

function renderExpression(expression: ArithmeticExpression): string {
  if (!expression.useParentheses) {
    return expression.values
      .map((value, index) => {
        if (index === 0) return formatOperand(value);
        return `${renderOperator(expression.operators[index - 1])} ${formatOperand(value)}`;
      })
      .join(" ");
  }

  let rendered = formatOperand(expression.values[0]);

  for (let index = 0; index < expression.operators.length; index += 1) {
    rendered = `(${rendered} ${renderOperator(expression.operators[index])} ${formatOperand(expression.values[index + 1])})`;
  }

  return rendered;
}

function renderOperator(operator: OperatorSymbol): string {
  return operator === "*" ? "x" : operator;
}

function formatOperand(value: number): string {
  return value < 0 ? `(${formatNumber(value)})` : formatNumber(value);
}

function unitPrompt(unit: UnitType): string {
  const labels: Partial<Record<UnitType, string>> = {
    b: "billions (B)",
    currency: "dollars ($)",
    k: "thousands (K)",
    m: "millions (M)",
    percentage: "percent (%)"
  };

  return unit === "none" ? "" : ` Answer in ${labels[unit] ?? unit.replaceAll("_", " ")}.`;
}

function hintFor(
  operation: ArithmeticOperation,
  divisionMode: ArithmeticDivisionMode,
  useParentheses: boolean
): string {
  const hints: Record<ArithmeticOperation, string> = {
    addition: "Combine the terms in manageable chunks.",
    division:
      divisionMode === "remainder"
        ? "Find the largest whole multiple of the divisor below the dividend."
        : "Divide from left to right and simplify each step.",
    mixed_operations: useParentheses
      ? "Work through the parentheses from the inside out."
      : "Use multiplication and division before addition and subtraction.",
    multiplication: "Break a factor into easier parts, then recombine.",
    subtraction: "Subtract one term at a time and track the sign."
  };

  return hints[operation];
}

function shortcutFor(
  operation: ArithmeticOperation,
  divisionMode: ArithmeticDivisionMode,
  useParentheses: boolean
): string {
  const shortcuts: Record<ArithmeticOperation, string> = {
    addition: "Round a term, add, then reverse the adjustment.",
    division:
      divisionMode === "remainder"
        ? "Use a nearby multiple, then subtract it from the dividend."
        : "Cancel common factors before dividing.",
    mixed_operations: useParentheses
      ? "Keep each intermediate result before moving to the next operation."
      : "Resolve multiplication and division first, then combine the remaining terms.",
    multiplication: "Use a nearby round factor and adjust.",
    subtraction: "Count up from the smaller value when the gap is easier to see."
  };

  return shortcuts[operation];
}

function buildQuestionId(
  templateId: string,
  expression: ArithmeticExpression,
  unit: UnitType,
  variantKey: string
): string {
  const valueKey = expression.values.map((value) => String(value).replace("-", "neg_").replace(".", "_")).join("-");
  const operatorKey = expression.operators
    .map((operator) => ({ "+": "add", "-": "sub", "*": "mul", "/": "div" })[operator])
    .join("-");

  return `custom_${templateId}_${operatorKey}_${valueKey}_${unit}_${variantKey}`;
}

function buildVariantKey(settings: DrillSettings): string {
  return [
    settings.arithmeticMultiplicationStyle ?? "difficulty_scaled",
    settings.arithmeticDivisionMode ?? "exact",
    settings.arithmeticDivisionRounding ?? "nearest_0_1",
    settings.arithmeticMixedOperators?.join("-") ?? "default-operators",
    settings.arithmeticUseParentheses === false ? "plain" : "parenthesized"
  ].join("_");
}

function difficultyScale(difficulty: Difficulty): number {
  return { beginner: 1, intermediate: 2, advanced: 4, expert: 8 }[difficulty];
}

function roundForRule(value: number, rule: ArithmeticDivisionRounding): number {
  return rule === "nearest_whole" ? Math.round(value) : Math.round(value * 10) / 10;
}

function roundingInstruction(rule: ArithmeticDivisionRounding): string {
  return rule === "nearest_whole" ? "Round to the nearest whole number." : "Round to the nearest tenth.";
}

function roundValue(value: number): number {
  return Number(value.toFixed(4));
}
