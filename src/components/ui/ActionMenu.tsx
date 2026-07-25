import {
  useState, useRef, useCallback, useLayoutEffect, useEffect, type JSX, type ComponentType,
} from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';

export interface ActionMenuItem {
  key: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

interface ActionMenuProps {
  items: ActionMenuItem[];
}

interface MenuStyle {
  position: 'fixed';
  left?: number;
  right?: number;
  width: number;
  zIndex: number;
  top?: number;
  bottom?: number;
}

const MENU_WIDTH = 190;
const ITEM_HEIGHT = 38;

export default function ActionMenu({ items }: ActionMenuProps): JSX.Element | null {
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<MenuStyle | null>(null);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef   = useRef<HTMLDivElement>(null);

  const calcPosition = useCallback((): MenuStyle | null => {
    if (!buttonRef.current) return null;
    const rect            = buttonRef.current.getBoundingClientRect();
    const viewportHeight  = window.innerHeight;
    const viewportWidth   = window.innerWidth;
    const menuHeight      = items.length * ITEM_HEIGHT + 8;
    const spaceBelow      = viewportHeight - rect.bottom;
    const showAbove       = spaceBelow < menuHeight && rect.top > menuHeight;
    const showLeftAligned = viewportWidth - rect.right < MENU_WIDTH;

    return {
      position: 'fixed',
      width: MENU_WIDTH,
      zIndex: 9999,
      ...(showLeftAligned ? { right: viewportWidth - rect.right } : { left: rect.right - MENU_WIDTH }),
      ...(showAbove ? { bottom: viewportHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
    };
  }, [items.length]);

  useLayoutEffect(() => {
    if (isOpen) setMenuStyle(calcPosition());
  }, [isOpen, calcPosition]);

  useEffect(() => {
    if (!isOpen) return;
    const update = (): void => setMenuStyle(calcPosition());
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [isOpen, calcPosition]);

  useEffect(() => {
    if (!isOpen) return;
    function handleOutside(e: MouseEvent): void {
      const inButton = buttonRef.current?.contains(e.target as Node) ?? false;
      const inMenu   = menuRef.current?.contains(e.target as Node) ?? false;
      if (!inButton && !inMenu) setIsOpen(false);
    }
    function handleEscape(e: KeyboardEvent): void {
      if (e.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  if (items.length === 0) return null;

  const menu = isOpen && menuStyle
    ? createPortal(
        <div
          ref={menuRef}
          style={menuStyle}
          className="bg-white border border-gray-200 rounded-lg shadow-2xl py-1"
        >
          {items.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => { setIsOpen(false); item.onClick(); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors ${
                  item.variant === 'danger'
                    ? 'text-red-600 hover:bg-red-50'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(o => !o)}
        className={`p-1.5 rounded-md transition-colors ${isOpen ? 'text-gray-700 bg-gray-100' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}
        title="More actions"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {menu}
    </>
  );
}
