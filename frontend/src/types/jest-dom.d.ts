/// <reference types="jest" />

// This file provides TypeScript type definitions for Jest DOM matchers
import '@testing-library/jest-dom';

declare global {
  namespace jest {
    interface Matchers<R> {
      // DOM Testing Library matchers
      toBeInTheDocument(): R;
      toBeVisible(): R;
      toBeEmpty(): R;
      toBeDisabled(): R;
      toBeEnabled(): R;
      toBeInvalid(): R;
      toBeRequired(): R;
      toBeValid(): R;
      toContainElement(element: HTMLElement | null): R;
      toContainHTML(htmlText: string): R;
      toHaveAttribute(attr: string, value?: string): R;
      toHaveClass(...classNames: string[]): R;
      toHaveFocus(): R;
      toHaveFormValues(expectedValues: Record<string, any>): R;
      toHaveStyle(css: string | Record<string, any>): R;
      toHaveTextContent(text: string | RegExp): R;
      toHaveValue(value?: string | string[] | number): R;
      toBeChecked(): R;
      toBePartiallyChecked(): R;
      toHaveDisplayValue(value: string | RegExp | (string | RegExp)[]): R;
      toBeEmptyDOMElement(): R;
      toHaveDescription(text: string | RegExp): R;
    }
  }
}

// This is needed for screen.getByText().toBeInTheDocument() and similar methods
declare namespace jest {
  interface JestMatchers<T> {
    toBeInTheDocument(): T;
    toBeVisible(): T;
    toBeEmpty(): T;
    toBeDisabled(): T;
    toBeEnabled(): T;
    toBeInvalid(): T;
    toBeRequired(): T;
    toBeValid(): T;
    toContainElement(element: HTMLElement | null): T;
    toContainHTML(htmlText: string): T;
    toHaveAttribute(attr: string, value?: string): T;
    toHaveClass(...classNames: string[]): T;
    toHaveFocus(): T;
    toHaveFormValues(expectedValues: Record<string, any>): T;
    toHaveStyle(css: string | Record<string, any>): T;
    toHaveTextContent(text: string | RegExp): T;
    toHaveValue(value?: string | string[] | number): T;
    toBeChecked(): T;
    toBePartiallyChecked(): T;
    toHaveDisplayValue(value: string | RegExp | (string | RegExp)[]): T;
    toBeEmptyDOMElement(): T;
    toHaveDescription(text: string | RegExp): T;
  }
}

// Add declarations for @testing-library/react
declare module '@testing-library/react' {
  interface Screen {
    getByText(text: string | RegExp): HTMLElement;
    queryByText(text: string | RegExp): HTMLElement | null;
  }
}

export {}; 