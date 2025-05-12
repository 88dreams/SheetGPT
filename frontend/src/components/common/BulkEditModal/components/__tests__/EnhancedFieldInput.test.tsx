import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import '@testing-library/jest-dom';

import EnhancedFieldInput from '../EnhancedFieldInput';
import { FieldDefinition, FieldProps } from '../../types';

// Mock the entity resolver hook
jest.mock('../../../../../../frontend/src/hooks/useEntityResolution', () => ({
  useEntityResolution: jest.fn((entityType: string, nameOrId: string | null, options?: any) => {
    if (nameOrId && nameOrId.includes('valid')) { return { entity: { id: 'resolved-id', name: nameOrId }, isLoading: false, error: null, resolutionInfo: { matchScore: 1 } }; }
    if (nameOrId && nameOrId.includes('context')) { return { entity: { id: 'context-id', name: nameOrId }, isLoading: false, error: null, resolutionInfo: { matchScore: 0.9, contextMatched: true } }; }
    if (nameOrId && nameOrId.includes('virtual')) { return { entity: { id: 'virtual-id', name: nameOrId }, isLoading: false, error: null, resolutionInfo: { matchScore: 1, virtualEntity: true } }; }
    if (nameOrId && nameOrId.includes('loading')) { return { entity: null, isLoading: true, error: null, resolutionInfo: {} }; }
    if (nameOrId && nameOrId.includes('error')) { return { entity: null, isLoading: false, error: new Error('Resolution failed'), resolutionInfo: {} }; }
    return { entity: null, isLoading: false, error: null, resolutionInfo: {} }; 
  }),
}));

// Mock the EntityResolutionBadge component
jest.mock('../../../../../../frontend/src/components/data/EntityUpdate/EntityResolutionBadge', () => ({
  __esModule: true,
  default: jest.fn(() => <div data-testid="resolution-badge">MockBadge</div>)
}));

// Mock antd components
const dayjs = require('dayjs');
jest.mock('antd', () => {
  const actual = jest.requireActual('antd');
  return Object.assign({}, actual, {
    Input: jest.fn(({ value, onChange, placeholder, prefix, suffix, loading, type, disabled, allowClear, onPressEnter, maxLength, showCount }: any) => (
        <div data-testid="input-container">
          {prefix && <span data-testid="input-prefix">{prefix}</span>}
          <input data-testid="input" type={type || 'text'} value={value || ''} onChange={onChange} placeholder={placeholder} disabled={disabled} maxLength={maxLength}/>
          {loading && <span data-testid="loading-indicator">Loading...</span>}
          {suffix && <span data-testid="input-suffix">{suffix}</span>}
          {showCount && <span>{`${(value || '').length} / ${maxLength}`}</span>}
        </div>
      )),
    Select: jest.fn(({ value, onChange, options, placeholder, loading, mode, allowClear, disabled, style, filterOption, notFoundContent, onSearch, onClear, showSearch }: any) => (
        <select 
            data-testid="select" 
            value={value}
            onChange={(e) => onChange(e.target.value, options?.find((o: {value:string}) => o.value === e.target.value))}
            disabled={loading || disabled}
            style={style}
        >
            {placeholder && !value && <option value="" disabled>{placeholder}</option>}
            {options?.map((opt: {value: string; label: string; key?: string}) => <option key={opt.key || opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
    )),
    DatePicker: jest.fn(({ value, onChange, style, allowClear, disabled }: any) => (
        <input type="date" data-testid="date-picker" value={value ? value.format('YYYY-MM-DD') : ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value ? dayjs(e.target.value) : null, e.target.value)} style={style} disabled={disabled} />
    )),
    Tooltip: jest.fn(({ title, children }: any) => <div title={title as string} data-testid="tooltip">{children}</div>),
    Tag: jest.fn(({ color, children }: any) => <span className={`tag-${color}`} data-testid="tag">{children}</span>),
    Space: jest.fn(({children}: any) => <div data-testid="space">{children}</div>),
    Alert: jest.fn(({message, type, showIcon, style, icon}: any) => <div data-testid="alert" data-type={type} style={style}>{message}</div>),
    Spin: jest.fn(({size}: any) => <div data-testid="spin" data-size={size}>Loading...</div>)
  });
});

describe('EnhancedFieldInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultFieldDefinition: FieldDefinition = {
    name: 'testField',
    type: 'string',
    required: false,
    description: 'A test field for strings'
  };

  const defaultProps: FieldProps = {
    field: defaultFieldDefinition,
    selected: true,
    value: 'initial value',
    onValueChange: jest.fn(),
  };

  it('renders a text input for string type', () => {
    render(<EnhancedFieldInput {...defaultProps} />);
    expect(screen.getByTestId('input')).toBeInTheDocument();
    expect(screen.getByTestId('input')).toHaveValue('initial value');
  });

  it('renders a number input for number type', () => {
    const numberField: FieldDefinition = { ...defaultFieldDefinition, name:'age', type: 'number' };
    render(<EnhancedFieldInput {...defaultProps} field={numberField} value={30} />);
    const input = screen.getByTestId('input') as HTMLInputElement;
    expect(input.type).toBe('number');
    expect(input).toHaveValue(30);
  });

  it('renders a date picker for date type', () => {
    const dateField: FieldDefinition = { ...defaultFieldDefinition, name:'birthDate', type: 'date' };
    render(<EnhancedFieldInput {...defaultProps} field={dateField} value={dayjs('2023-01-01')} />);
    expect(screen.getByTestId('date-picker')).toBeInTheDocument();
    // Further assertions would depend on the mock DatePicker's rendering
  });

  it('renders a select for boolean type', () => {
    const booleanField: FieldDefinition = { ...defaultFieldDefinition, name:'isActive', type: 'boolean' };
    render(<EnhancedFieldInput {...defaultProps} field={booleanField} value={true} />);
    expect(screen.getByTestId('select')).toBeInTheDocument();
    expect(screen.getByTestId('select')).toHaveValue('true');
  });

  it('handles foreign key with relatedEntities (Select)', () => {
    const fkField: FieldDefinition = { ...defaultFieldDefinition, name: 'league_id', type: 'relation' }; // type: 'relation' or actual type used for FKs
    const relatedLeagues = [{id: 'l1', name: 'League One'}, {id: 'l2', name: 'League Two'}];
    render(<EnhancedFieldInput {...defaultProps} field={fkField} value={'l1'} relatedEntities={relatedLeagues} />);
    expect(screen.getByTestId('select')).toBeInTheDocument();
    expect(screen.getByTestId('select')).toHaveValue('l1');
    // Check if options are rendered based on relatedLeagues by the mock Select
  });

  it('handles foreign key without relatedEntities (Input with search)', () => {
    const fkField: FieldDefinition = { ...defaultFieldDefinition, name: 'stadium_id', type: 'relation' };
    render(<EnhancedFieldInput {...defaultProps} field={fkField} value={null} relatedEntities={[]} />); // No related entities
    expect(screen.getByTestId('input')).toBeInTheDocument(); // Should render an Input for search
    expect(screen.getByTestId('input')).toHaveAttribute('placeholder', 'Search for stadium...');
  });

  // ... more tests for interactions, onValueChange calls, resolution display etc. ...

});