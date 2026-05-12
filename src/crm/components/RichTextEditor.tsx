import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import { useEffect, useCallback } from 'react';
import { Button } from '@/crm/components/ui/button';
import { Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, Highlighter, Type } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/crm/components/ui/popover';
import { cn } from '@/crm/lib/utils';

const COLORS = [
  { label: 'Noir', value: '#000000' },
  { label: 'Rouge', value: '#DC2626' },
  { label: 'Vert', value: '#16A34A' },
  { label: 'Bleu', value: '#2563EB' },
  { label: 'Orange', value: '#EA580C' },
  { label: 'Violet', value: '#9333EA' },
  { label: 'Gris', value: '#6B7280' },
  { label: 'Rose', value: '#DB2777' },
];

const HIGHLIGHT_COLORS = [
  { label: 'Jaune', value: '#FEF08A' },
  { label: 'Vert', value: '#BBF7D0' },
  { label: 'Bleu', value: '#BFDBFE' },
  { label: 'Rose', value: '#FBCFE8' },
  { label: 'Orange', value: '#FED7AA' },
];

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  editable?: boolean;
  className?: string;
  minHeight?: string;
  placeholder?: string;
}

function MenuBar({ editor }: { editor: Editor }) {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b p-1 bg-muted/30">
      <Button
        type="button" size="icon" variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
        className="h-7 w-7" onClick={() => editor.chain().focus().toggleBold().run()}
      ><Bold className="h-3.5 w-3.5" /></Button>

      <Button
        type="button" size="icon" variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
        className="h-7 w-7" onClick={() => editor.chain().focus().toggleItalic().run()}
      ><Italic className="h-3.5 w-3.5" /></Button>

      <Button
        type="button" size="icon" variant={editor.isActive('underline') ? 'secondary' : 'ghost'}
        className="h-7 w-7" onClick={() => editor.chain().focus().toggleUnderline().run()}
      ><UnderlineIcon className="h-3.5 w-3.5" /></Button>

      <div className="w-px h-5 bg-border mx-0.5" />

      {/* Text color */}
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" size="icon" variant="ghost" className="h-7 w-7">
            <Type className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <p className="text-xs font-medium text-muted-foreground mb-1">Couleur texte</p>
          <div className="flex gap-1">
            {COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                className="w-6 h-6 rounded-full border border-border hover:scale-110 transition-transform"
                style={{ backgroundColor: c.value }}
                title={c.label}
                onClick={() => editor.chain().focus().setColor(c.value).run()}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Highlight */}
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" size="icon" variant={editor.isActive('highlight') ? 'secondary' : 'ghost'} className="h-7 w-7">
            <Highlighter className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <p className="text-xs font-medium text-muted-foreground mb-1">Surlignage</p>
          <div className="flex gap-1">
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                className="w-6 h-6 rounded-full border border-border hover:scale-110 transition-transform"
                style={{ backgroundColor: c.value }}
                title={c.label}
                onClick={() => editor.chain().focus().toggleHighlight({ color: c.value }).run()}
              />
            ))}
            <button
              type="button"
              className="w-6 h-6 rounded-full border border-border hover:scale-110 transition-transform bg-background text-xs"
              title="Retirer"
              onClick={() => editor.chain().focus().unsetHighlight().run()}
            >✕</button>
          </div>
        </PopoverContent>
      </Popover>

      <div className="w-px h-5 bg-border mx-0.5" />

      {/* Font size quick buttons */}
      <Button
        type="button" size="sm" variant="ghost"
        className="h-7 text-[10px] px-1.5"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >H3</Button>
      <Button
        type="button" size="sm" variant="ghost"
        className="h-7 text-[10px] px-1.5"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >H2</Button>

      <div className="w-px h-5 bg-border mx-0.5" />

      <Button
        type="button" size="icon" variant={editor.isActive({ textAlign: 'left' }) ? 'secondary' : 'ghost'}
        className="h-7 w-7" onClick={() => editor.chain().focus().setTextAlign('left').run()}
      ><AlignLeft className="h-3.5 w-3.5" /></Button>
      <Button
        type="button" size="icon" variant={editor.isActive({ textAlign: 'center' }) ? 'secondary' : 'ghost'}
        className="h-7 w-7" onClick={() => editor.chain().focus().setTextAlign('center').run()}
      ><AlignCenter className="h-3.5 w-3.5" /></Button>
    </div>
  );
}

export default function RichTextEditor({ content, onChange, editable = true, className, minHeight = '300px', placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm max-w-none focus:outline-none p-3',
          'prose-headings:font-bold prose-h2:text-lg prose-h3:text-base',
          '[&_p]:my-0.5 [&_h2]:my-1 [&_h3]:my-1',
        ),
        style: `min-height: ${minHeight}`,
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editable, editor]);

  if (!editor) return null;

  return (
    <div className={cn("border rounded-md overflow-hidden bg-background", className)}>
      {editable && <MenuBar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}

// Helper to render HTML script with variable substitution
export function renderScriptHtml(html: string, variables: Record<string, string>): string {
  let result = html;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '');
  }
  return result;
}
