import { apiClient } from '../utils/apiClient';
import { Contact } from '../components/common/ContactsList';

const contactService = {
  getContact: (id: string) => {
    return apiClient.get<Contact>(`/contacts/${id}`);
  },

  createContact: (data: Partial<Contact>) => {
    return apiClient.post<Contact>('/contacts', data);
  },

  updateContact: (id: string, data: Partial<Contact>) => {
    return apiClient.put<Contact>(`/contacts/${id}`, data);
  },

  deleteContact: (id: string) => {
    return apiClient.delete(`/contacts/${id}`);
  },
};

export default contactService; 