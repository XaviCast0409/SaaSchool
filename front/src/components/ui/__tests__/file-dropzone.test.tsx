import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { formatFileSize, fileKind } from '@/lib/fileMeta';
import { FileDropzone } from '../file-dropzone';
import { AttachmentList } from '../attachment-list';

describe('fileMeta helpers', () => {
  it('formats file size in B, KB and MB correctly', () => {
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(2097152)).toBe('2.0 MB');
  });

  it('determines fileKind case-insensitively', () => {
    expect(fileKind('acta.PDF')).toBe('pdf');
    expect(fileKind('foto.PNG')).toBe('image');
    expect(fileKind('informe.DOCX')).toBe('doc');
    expect(fileKind('notas.XLSX')).toBe('sheet');
    expect(fileKind('codigo.ts')).toBe('other');
  });
});

describe('FileDropzone', () => {
  afterEach(cleanup);

  it('rejects files larger than maxSizeMb and does not call onChange', () => {
    const handleReject = vi.fn();
    const handleChange = vi.fn();

    render(
      <FileDropzone
        files={[]}
        onChange={handleChange}
        onReject={handleReject}
        maxSizeMb={10}
      />,
    );

    const zone = screen.getByRole('button');
    const bigFile = new File([new Uint8Array(1)], 'big.pdf', { type: 'application/pdf' });
    Object.defineProperty(bigFile, 'size', { value: 11 * 1024 * 1024 });

    fireEvent.drop(zone, { dataTransfer: { files: [bigFile] } });

    expect(handleReject).toHaveBeenCalledTimes(1);
    expect(handleReject.mock.calls[0][0][0]).toContain('10 MB');
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('rejects files not matching accept attribute', () => {
    const handleReject = vi.fn();
    const handleChange = vi.fn();

    render(
      <FileDropzone
        files={[]}
        onChange={handleChange}
        onReject={handleReject}
        accept=".pdf,image/*"
      />,
    );

    const zone = screen.getByRole('button');
    const exeFile = new File(['binary'], 'virus.exe', { type: 'application/x-msdownload' });

    fireEvent.drop(zone, { dataTransfer: { files: [exeFile] } });

    expect(handleReject).toHaveBeenCalledTimes(1);
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('accepts valid file and calls onChange with combined files', () => {
    const handleChange = vi.fn();

    render(
      <FileDropzone
        files={[]}
        onChange={handleChange}
        accept=".pdf,image/*"
      />,
    );

    const zone = screen.getByRole('button');
    const validFile = new File(['pdf-content'], 'acta.pdf', { type: 'application/pdf' });

    fireEvent.drop(zone, { dataTransfer: { files: [validFile] } });

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith([validFile]);
  });
});

describe('AttachmentList', () => {
  afterEach(cleanup);

  it('renders null when items is empty', () => {
    const { container } = render(<AttachmentList items={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('calls onRemove with index when remove button is clicked', () => {
    const handleRemove = vi.fn();
    const item = new File(['content'], 'acta.pdf', { type: 'application/pdf' });

    render(<AttachmentList items={[item]} onRemove={handleRemove} />);

    const removeBtn = screen.getByRole('button', { name: 'Quitar acta.pdf' });
    fireEvent.click(removeBtn);

    expect(handleRemove).toHaveBeenCalledWith(0);
  });
});
