export type FormulaVariables = Record<string, number>;

type Operator = "+" | "-" | "*" | "/" | "^" | "u+" | "u-";

interface NumberToken {
  type: "number";
  value: number;
}

interface IdentifierToken {
  type: "identifier";
  name: string;
}

interface OperatorToken {
  type: "operator";
  operator: Operator;
}

interface ParenthesisToken {
  type: "parenthesis";
  value: "(" | ")";
}

type Token = NumberToken | IdentifierToken | OperatorToken | ParenthesisToken;
type RpnToken = NumberToken | IdentifierToken | OperatorToken;

const operatorPrecedence: Record<Operator, number> = {
  "+": 1,
  "-": 1,
  "*": 2,
  "/": 2,
  "^": 3,
  "u+": 4,
  "u-": 4
};

const rightAssociativeOperators = new Set<Operator>(["^", "u+", "u-"]);

export function evaluateFormulaExpression(expression: string, variables: FormulaVariables): number {
  const tokens = tokenizeFormula(expression);
  const rpnTokens = toReversePolishNotation(tokens);
  const value = evaluateReversePolishNotation(rpnTokens, variables);

  if (!Number.isFinite(value)) {
    throw new Error("Formula result must be a finite number.");
  }

  return value;
}

function tokenizeFormula(expression: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < expression.length) {
    const character = expression[index];

    if (/\s/.test(character)) {
      index += 1;
      continue;
    }

    if (isDigit(character) || (character === "." && isDigit(expression[index + 1] ?? ""))) {
      const nextIndex = readNumber(expression, index);
      const value = Number(expression.slice(index, nextIndex));

      if (!Number.isFinite(value)) {
        throw new Error(`Invalid number in formula near "${expression.slice(index, nextIndex)}".`);
      }

      tokens.push({ type: "number", value });
      index = nextIndex;
      continue;
    }

    if (isIdentifierStart(character)) {
      const nextIndex = readIdentifier(expression, index);
      tokens.push({ type: "identifier", name: expression.slice(index, nextIndex) });
      index = nextIndex;
      continue;
    }

    if (character === "(" || character === ")") {
      tokens.push({ type: "parenthesis", value: character });
      index += 1;
      continue;
    }

    if (isBinaryOperator(character)) {
      tokens.push({
        type: "operator",
        operator: resolveUnaryOperator(character, tokens)
      });
      index += 1;
      continue;
    }

    throw new Error(`Unsupported character "${character}" in formula.`);
  }

  if (tokens.length === 0) {
    throw new Error("Formula expression cannot be empty.");
  }

  return tokens;
}

function toReversePolishNotation(tokens: Token[]): RpnToken[] {
  const output: RpnToken[] = [];
  const operators: Array<OperatorToken | ParenthesisToken> = [];

  for (const token of tokens) {
    if (token.type === "number" || token.type === "identifier") {
      output.push(token);
      continue;
    }

    if (token.type === "parenthesis") {
      if (token.value === "(") {
        operators.push(token);
        continue;
      }

      let foundOpeningParenthesis = false;
      while (operators.length > 0) {
        const operator = operators.pop();
        if (operator?.type === "parenthesis") {
          foundOpeningParenthesis = true;
          break;
        }

        if (operator) {
          output.push(operator);
        }
      }

      if (!foundOpeningParenthesis) {
        throw new Error("Formula has mismatched parentheses.");
      }

      continue;
    }

    while (operators.length > 0) {
      const previousOperator = operators[operators.length - 1];

      if (previousOperator.type === "parenthesis") {
        break;
      }

      const shouldPop =
        rightAssociativeOperators.has(token.operator)
          ? operatorPrecedence[token.operator] < operatorPrecedence[previousOperator.operator]
          : operatorPrecedence[token.operator] <= operatorPrecedence[previousOperator.operator];

      if (!shouldPop) {
        break;
      }

      output.push(operators.pop() as OperatorToken);
    }

    operators.push(token);
  }

  while (operators.length > 0) {
    const operator = operators.pop();
    if (operator?.type === "parenthesis") {
      throw new Error("Formula has mismatched parentheses.");
    }

    if (operator) {
      output.push(operator);
    }
  }

  return output;
}

function evaluateReversePolishNotation(tokens: readonly RpnToken[], variables: FormulaVariables): number {
  const values: number[] = [];

  for (const token of tokens) {
    if (token.type === "number") {
      values.push(token.value);
      continue;
    }

    if (token.type === "identifier") {
      const value = variables[token.name];

      if (value === undefined) {
        throw new Error(`Missing formula variable "${token.name}".`);
      }

      if (!Number.isFinite(value)) {
        throw new Error(`Formula variable "${token.name}" must be finite.`);
      }

      values.push(value);
      continue;
    }

    if (token.operator === "u+" || token.operator === "u-") {
      const value = values.pop();
      if (value === undefined) {
        throw new Error("Formula has an invalid unary operator.");
      }

      values.push(token.operator === "u-" ? -value : value);
      continue;
    }

    const right = values.pop();
    const left = values.pop();

    if (left === undefined || right === undefined) {
      throw new Error("Formula has an invalid operator sequence.");
    }

    values.push(applyBinaryOperator(token.operator, left, right));
  }

  if (values.length !== 1) {
    throw new Error("Formula has an invalid expression.");
  }

  return values[0];
}

function applyBinaryOperator(operator: Operator, left: number, right: number): number {
  if (operator === "+") {
    return left + right;
  }

  if (operator === "-") {
    return left - right;
  }

  if (operator === "*") {
    return left * right;
  }

  if (operator === "/") {
    if (right === 0) {
      throw new Error("Formula cannot divide by zero.");
    }

    return left / right;
  }

  if (operator === "^") {
    return left ** right;
  }

  throw new Error(`Unsupported operator "${operator}".`);
}

function resolveUnaryOperator(character: string, tokens: readonly Token[]): Operator {
  if (character !== "+" && character !== "-") {
    return character as Operator;
  }

  const previousToken = tokens[tokens.length - 1];
  const isUnary =
    previousToken === undefined ||
    previousToken.type === "operator" ||
    (previousToken.type === "parenthesis" && previousToken.value === "(");

  if (!isUnary) {
    return character;
  }

  return character === "-" ? "u-" : "u+";
}

function readNumber(expression: string, startIndex: number): number {
  let index = startIndex;
  let hasDecimal = false;

  while (index < expression.length) {
    const character = expression[index];

    if (character === ".") {
      if (hasDecimal) {
        break;
      }

      hasDecimal = true;
      index += 1;
      continue;
    }

    if (!isDigit(character)) {
      break;
    }

    index += 1;
  }

  return index;
}

function readIdentifier(expression: string, startIndex: number): number {
  let index = startIndex + 1;

  while (index < expression.length && isIdentifierPart(expression[index])) {
    index += 1;
  }

  return index;
}

function isDigit(character: string): boolean {
  return character >= "0" && character <= "9";
}

function isIdentifierStart(character: string): boolean {
  return /[A-Za-z_]/.test(character);
}

function isIdentifierPart(character: string): boolean {
  return /[A-Za-z0-9_]/.test(character);
}

function isBinaryOperator(character: string): boolean {
  return character === "+" || character === "-" || character === "*" || character === "/" || character === "^";
}
