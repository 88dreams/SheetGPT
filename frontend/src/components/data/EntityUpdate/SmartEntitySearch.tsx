import React from 'react';
import { Input, AutoComplete } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { Entity, EntityType } from '../../../types/sports';

interface SmartEntitySearchProps {
  onEntitySelect: (entity: Entity) => void;
  entityTypes: EntityType[];
  placeholder?: string;
  entities?: Entity[];
}

interface AutoCompleteOption {
  key: string;
  value: string;
  label: string;
  entity: Entity;
}

// Create a fully class-based component to avoid hooks-related issues
class SmartEntitySearch extends React.Component<SmartEntitySearchProps, { searchText: string, options: AutoCompleteOption[] }> {
  static defaultProps = {
    placeholder: "Search for Stadium, League, or Team...",
    entities: []
  };

  constructor(props: SmartEntitySearchProps) {
    super(props);
    this.state = {
      searchText: '',
      options: []
    };
  }

  // Reset state when entities or entityTypes change, but with deep comparison
  componentDidUpdate(prevProps: SmartEntitySearchProps) {
    // Safety check to prevent updating when the component is unmounting
    if (!this.props.entities) return;
    
    // Only reset state when the actual entity list changes meaningfully
    const prevType = prevProps.entityTypes?.join('-') || '';
    const currType = this.props.entityTypes?.join('-') || '';
    
    const prevLength = prevProps.entities?.length || 0;
    const currLength = this.props.entities?.length || 0;
    
    // Deep compare to avoid unnecessary resets
    if (
      prevType !== currType || 
      prevLength !== currLength || 
      (prevLength > 0 && currLength > 0 && prevProps.entities[0]?.id !== this.props.entities[0]?.id)
    ) {
      this.setState({
        searchText: '',
        options: []
      });
    }
  }

  handleSearch = (text: string) => {
    // Use a single setState call to update both values at once
    if (!text) {
      this.setState({ 
        searchText: text,
        options: [] 
      });
      return;
    }

    const { entities = [] } = this.props;
    const searchLower = text.toLowerCase();
    
    try {
      // Guard against potential issues if entities is invalid
      if (!Array.isArray(entities)) {
        this.setState({ 
          searchText: text,
          options: [] 
        });
        return;
      }
      
      const filtered = entities
        .filter(entity => entity.name?.toLowerCase?.().includes(searchLower))
        .map(entity => ({
          key: entity.id || '',
          value: entity.name || '',
          label: entity.name || '',
          entity: entity
        }));

      this.setState({ 
        searchText: text,
        options: filtered 
      });
    } catch (error) {
      // Fail gracefully by just updating search text if filtering fails
      this.setState({ 
        searchText: text,
        options: [] 
      });
    }
  };

  handleSelect = (_: string, option: AutoCompleteOption) => {
    this.props.onEntitySelect(option.entity);
    this.setState({
      searchText: '',
      options: []
    });
  };

  render() {
    const { placeholder } = this.props;
    const { searchText, options } = this.state;

    return (
      <AutoComplete
        style={{ width: '100%' }}
        options={options}
        onSelect={this.handleSelect}
        onSearch={this.handleSearch}
        placeholder={placeholder}
        value={searchText}
      >
        <Input
          size="middle"
          prefix={<SearchOutlined />}
          style={{ width: '100%' }}
        />
      </AutoComplete>
    );
  }
}

// Export both named and default exports for compatibility
export { SmartEntitySearch };

export default SmartEntitySearch; 