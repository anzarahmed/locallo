import type { JSX } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Link as LinkIcon,
  Undo,
  Redo,
} from 'lucide-react';

interface RichTextEditorProps {
  label: string;
  name: string;
  value: string;
  onChange: (html: string) => void;
  onBlur?: () => void;
  touched?: boolean;
  error?: string;
  required?: boolean;
}

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, active, disabled, label, children }: ToolbarButtonProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`p-1.5 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        active ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({
  label,
  name,
  value,
  onChange,
  onBlur,
  touched,
  error,
  required,
}: RichTextEditorProps): JSX.Element {
  const invalid = touched === true && Boolean(error);

  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
    onBlur: () => onBlur?.(),
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[180px] px-3.5 py-2.5 text-sm text-gray-900',
      },
    },
  });

  function setLink(): void {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').url as string | undefined;
    const url = window.prompt('URL', previousUrl ?? '');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }

  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div
        className={`border rounded-lg overflow-hidden focus-within:ring-2 focus-within:border-transparent transition-shadow ${
          invalid ? 'border-red-400 focus-within:ring-red-400 bg-red-50' : 'border-gray-300 focus-within:ring-indigo-500'
        }`}
      >
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 bg-gray-50">
          <ToolbarButton label="Bold" active={editor?.isActive('bold')} onClick={() => editor?.chain().focus().toggleBold().run()}>
            <Bold className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton label="Italic" active={editor?.isActive('italic')} onClick={() => editor?.chain().focus().toggleItalic().run()}>
            <Italic className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton label="Heading 1" active={editor?.isActive('heading', { level: 1 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}>
            <Heading1 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton label="Heading 2" active={editor?.isActive('heading', { level: 2 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>
            <Heading2 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton label="Bullet List" active={editor?.isActive('bulletList')} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
            <List className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton label="Ordered List" active={editor?.isActive('orderedList')} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
            <ListOrdered className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton label="Link" active={editor?.isActive('link')} onClick={setLink}>
            <LinkIcon className="w-4 h-4" />
          </ToolbarButton>
          <div className="w-px h-5 bg-gray-300 mx-1" />
          <ToolbarButton label="Undo" disabled={!editor?.can().undo()} onClick={() => editor?.chain().focus().undo().run()}>
            <Undo className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton label="Redo" disabled={!editor?.can().redo()} onClick={() => editor?.chain().focus().redo().run()}>
            <Redo className="w-4 h-4" />
          </ToolbarButton>
        </div>
        <EditorContent editor={editor} id={name} />
      </div>
      {invalid && (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
