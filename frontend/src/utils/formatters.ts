import { format, isThisYear, isToday, isYesterday } from 'date-fns';

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  if (isToday(date)) {
    return format(date, "'Today' h:mm a");
  } else if (isYesterday(date)) {
    return 'Yesterday';
  } else if (isThisYear(date)) {
    return format(date, 'MMM d');
  } else {
    return format(date, 'MM/dd/yy');
  }
}; 