declare module 'react-dnd' {
  import { FC, ReactNode, Ref } from 'react';

  export interface DndProviderProps {
    backend: any;
    children: ReactNode;
  }

  export const DndProvider: FC<DndProviderProps>;

  export interface DragSourceMonitor<T = any, R = any> {
    canDrag(): boolean;
    isDragging(): boolean;
    getItemType(): string;
    getItem(): T;
    getDropResult(): R;
    didDrop(): boolean;
    getInitialClientOffset(): { x: number, y: number } | null;
    getInitialSourceClientOffset(): { x: number, y: number } | null;
    getClientOffset(): { x: number, y: number } | null;
    getDifferenceFromInitialOffset(): { x: number, y: number } | null;
    getSourceClientOffset(): { x: number, y: number } | null;
  }

  export interface DropTargetMonitor<T = any, R = any> {
    canDrop(): boolean;
    isOver(options?: { shallow: boolean }): boolean;
    getItemType(): string;
    getItem(): T;
    getDropResult(): R;
    didDrop(): boolean;
    getInitialClientOffset(): { x: number, y: number } | null;
    getInitialSourceClientOffset(): { x: number, y: number } | null;
    getClientOffset(): { x: number, y: number } | null;
    getDifferenceFromInitialOffset(): { x: number, y: number } | null;
    getSourceClientOffset(): { x: number, y: number } | null;
  }

  export interface DragSourceOptions {
    dropEffect?: string;
    canDrag?: boolean | ((monitor: DragSourceMonitor) => boolean);
  }

  export interface DropTargetOptions {
    canDrop?: boolean | ((monitor: DropTargetMonitor) => boolean);
  }

  export function useDrag<ItemType = any, CollectedProps = any, DropResult = any>(
    spec: {
      type: string | symbol;
      item: ItemType | ((monitor: DragSourceMonitor) => ItemType);
      collect?: (monitor: DragSourceMonitor<ItemType, DropResult>) => CollectedProps;
      canDrag?: boolean | ((monitor: DragSourceMonitor<ItemType, DropResult>) => boolean);
      end?: (item: ItemType, monitor: DragSourceMonitor<ItemType, DropResult>) => void;
      isDragging?: (monitor: DragSourceMonitor<ItemType, DropResult>) => boolean;
    }
  ): [CollectedProps, Ref<any>];

  export function useDrop<ItemType = any, CollectedProps = any, DropResult = any>(
    spec: {
      accept: string | symbol | string[] | symbol[];
      drop?: (item: ItemType, monitor: DropTargetMonitor<ItemType, DropResult>) => DropResult | void;
      collect?: (monitor: DropTargetMonitor<ItemType, DropResult>) => CollectedProps;
      canDrop?: boolean | ((item: ItemType, monitor: DropTargetMonitor<ItemType, DropResult>) => boolean);
      hover?: (item: ItemType, monitor: DropTargetMonitor<ItemType, DropResult>) => void;
    }
  ): [CollectedProps, Ref<any>];
}

declare module 'react-dnd-html5-backend' {
  export const HTML5Backend: any;
} 