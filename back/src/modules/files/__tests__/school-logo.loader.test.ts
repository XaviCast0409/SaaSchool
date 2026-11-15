import { describe, it, expect } from 'vitest';
import { imageSize } from '../school-logo.loader';

describe('tamaño del logo para incrustarlo en Excel', () => {
  it('lee ancho y alto de un PNG', () => {
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAMAAAACCAYAAACddGYaAAAAEklEQVR42mP8z8Dwn4EIwDiqEAA7tgP9cv6rMQAAAABJRU5ErkJggg==',
      'base64',
    );
    expect(imageSize(png, 'png')).toEqual({ width: 3, height: 2 });
  });

  it('lee ancho y alto de un JPEG (marcador SOF0)', () => {
    // SOI + APP0 corto + SOF0 con alto 40 y ancho 120
    const jpeg = Buffer.from([
      0xff, 0xd8,
      0xff, 0xe0, 0x00, 0x04, 0x00, 0x00,
      0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x28, 0x00, 0x78, 0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
    ]);
    expect(imageSize(jpeg, 'jpeg')).toEqual({ width: 120, height: 40 });
  });

  it('devuelve null si el archivo no es válido', () => {
    expect(imageSize(Buffer.from('hola'), 'png')).toBeNull();
    expect(imageSize(Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a]), 'jpeg')).toBeNull();
  });
});
