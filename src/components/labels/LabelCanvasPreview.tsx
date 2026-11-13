/**
 * ARMS - 1:1 High-Fidelity Vector Label Preview (100 x 50 mm)
 * Strictly matches approved archive label specification layout and thermal print dimensions.
 */

import React, { useEffect, useState } from 'react';
import { LabelData } from '../../types';
import { generateQRDataURL, getQRCodeText } from '../../utils/labelGenerator';


interface LabelCanvasPreviewProps {
  data: LabelData;
  scale?: number; // scale multiplier for visual display
  className?: string;
}

export const LabelCanvasPreview: React.FC<LabelCanvasPreviewProps> = ({
  data,
  scale = 1.0,
  className = '',
}) => {
  const [qrSrc, setQrSrc] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    const text = getQRCodeText(data);
    generateQRDataURL(text).then(url => {
      if (isMounted) setQrSrc(url);
    });
    return () => {
      isMounted = false;
    };
  }, [data]);

  // Base dimensions in millimeters
  const widthMm = 100;
  const heightMm = 50;

  // We can render in SVG with viewBox 0 0 100 50 so 1 unit = 1 millimeter!
  return (
    <div
      className={`inline-block shadow-sm transition-all bg-white select-none rounded border border-slate-300 dark:border-slate-700 ${className}`}
      style={{
        width: `${widthMm * 3.78 * scale}px`, // ~378px at scale 1
        height: `${heightMm * 3.78 * scale}px`, // ~189px at scale 1
      }}
    >
      <svg
        viewBox="0 0 100 50"
        className="w-full h-full text-black font-sans"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background */}
        <rect x="0" y="0" width="100" height="50" fill="#FFFFFF" />

        {/* 1. Outer Border: rounded rectangle, X: 4 to 97, Y: 2.5 to 47.4 */}
        <rect
          x="4"
          y="2.5"
          width="93"
          height="44.9"
          rx="2.6"
          fill="none"
          stroke="#000000"
          strokeWidth="0.45"
        />

        {/* 2. Header: Solid black bar top of the frame, Y: 2.5 to 11.9 */}
        <g>
          {/* Top-rounded header bar */}
          <path
            d="M 6.6 2.5 L 94.4 2.5 Q 97 2.5 97 5.1 L 97 11.9 L 4 11.9 L 4 5.1 Q 4 2.5 6.6 2.5 Z"
            fill="#000000"
          />

          {/* White Intercom Logo inside header bar */}
          {/* Speech bubble symbol */}
          <g transform="translate(6.8, 4.4)">
            <rect width="5.4" height="4.8" rx="1.1" fill="#FFFFFF" />
            <path d="M 1.2 4.8 L 2.4 4.8 L 0.8 5.8 Z" fill="#FFFFFF" />
            {/* 4 dark cutouts */}
            <rect x="1.0" y="1.5" width="0.5" height="2.2" rx="0.25" fill="#000000" />
            <rect x="1.9" y="1.0" width="0.5" height="3.0" rx="0.25" fill="#000000" />
            <rect x="2.8" y="1.0" width="0.5" height="3.0" rx="0.25" fill="#000000" />
            <rect x="3.7" y="1.5" width="0.5" height="2.2" rx="0.25" fill="#000000" />

            {/* Intercom typography in header */}
            <text
              x="7.2"
              y="4.2"
              fill="#FFFFFF"
              fontFamily="Helvetica, Arial, sans-serif"
              fontSize="3.8"
              fontWeight="bold"
              letterSpacing="-0.04em"
            >
              intercom
            </text>
          </g>
        </g>

        {/* 3. Left Box: rounded rectangle, X: 6.8 to 47.7, Y: 14.4 to 44.8 */}
        <rect
          x="6.8"
          y="14.4"
          width="40.9"
          height="30.4"
          rx="2.0"
          fill="none"
          stroke="#000000"
          strokeWidth="0.45"
        />

        {/* Horizontal divider inside left box at Y ≈ 35 */}
        <line x1="6.8" y1="35.0" x2="47.7" y2="35.0" stroke="#000000" strokeWidth="0.4" />

        {/* Contents of Left Box */}
        {data.type === 'box' ? (
          <>
            {/* Box Code (huge font e.g. D42) */}
            <text
              x="27.25"
              y="30.2"
              textAnchor="middle"
              fill="#000000"
              fontFamily="Helvetica, Arial, sans-serif"
              fontSize="14.5"
              fontWeight="bold"
              letterSpacing="-0.02em"
            >
              {data.boxCode}
            </text>

            {/* "ARCHIVE BOX" bottom label */}
            <text
              x="27.25"
              y="41.2"
              textAnchor="middle"
              fill="#000000"
              fontFamily="Helvetica, Arial, sans-serif"
              fontSize="2.7"
              fontWeight="bold"
              letterSpacing="0.22em"
            >
              ARCHIVE BOX
            </text>
          </>
        ) : (
          <>
            {/* Word "Dossier" */}
            <text
              x="27.25"
              y="19.6"
              textAnchor="middle"
              fill="#000000"
              fontFamily="Helvetica, Arial, sans-serif"
              fontSize="3.4"
              fontWeight="bold"
            >
              Dossier
            </text>

            {/* Huge Dossier Number */}
            <text
              x="27.25"
              y="32.8"
              textAnchor="middle"
              fill="#000000"
              fontFamily="Helvetica, Arial, sans-serif"
              fontSize="12.5"
              fontWeight="bold"
            >
              {data.dossierNumber || 1}
            </text>

            {/* Word "Box" */}
            <text
              x="27.25"
              y="38.5"
              textAnchor="middle"
              fill="#000000"
              fontFamily="Helvetica, Arial, sans-serif"
              fontSize="2.2"
              fontWeight="bold"
            >
              Box
            </text>

            {/* Box Code */}
            <text
              x="27.25"
              y="42.6"
              textAnchor="middle"
              fill="#000000"
              fontFamily="Helvetica, Arial, sans-serif"
              fontSize="3.6"
              fontWeight="bold"
            >
              {data.boxCode}
            </text>
          </>
        )}

        {/* 4. QR Code: top right, X ≈ 62.5 to 81, Y ≈ 14.8 to 33.3 */}
        {/* Corner Brackets */}
        <g stroke="#000000" strokeWidth="0.45" fill="none">
          {/* Top-left */}
          <path d="M 60.8 16.5 L 60.8 13.5 L 63.8 13.5" />
          {/* Top-right */}
          <path d="M 79.8 13.5 L 82.8 13.5 L 82.8 16.5" />
          {/* Bottom-left */}
          <path d="M 60.8 31.8 L 60.8 34.8 L 63.8 34.8" />
          {/* Bottom-right */}
          <path d="M 79.8 34.8 L 82.8 34.8 L 82.8 31.8" />
        </g>

        {/* QR Code Image */}
        {qrSrc && (
          <image
            href={qrSrc}
            x="62.5"
            y="14.8"
            width="18.5"
            height="18.5"
            preserveAspectRatio="none"
          />
        )}

        {/* 5. Range Box (FROM / TO): rounded rectangle, X: 50.9 to 94, Y: 36.1 to 44.7 */}
        <rect
          x="50.9"
          y="36.1"
          width="43.1"
          height="8.6"
          rx="1.8"
          fill="none"
          stroke="#000000"
          strokeWidth="0.45"
        />

        {/* Vertical divider line at X ≈ 72.4 */}
        <line x1="72.4" y1="36.1" x2="72.4" y2="44.7" stroke="#000000" strokeWidth="0.45" />

        {/* FROM Section (left half center ≈ 61.65) */}
        <text
          x="61.65"
          y="38.8"
          textAnchor="middle"
          fill="#000000"
          fontFamily="Helvetica, Arial, sans-serif"
          fontSize="2.1"
          fontWeight="bold"
        >
          FROM
        </text>
        <text
          x="61.65"
          y="43.5"
          textAnchor="middle"
          fill="#000000"
          fontFamily="Helvetica, Arial, sans-serif"
          fontSize="4.5"
          fontWeight="bold"
        >
          {data.fromJobId}
        </text>

        {/* TO Section (right half center ≈ 83.2) */}
        <text
          x="83.2"
          y="38.8"
          textAnchor="middle"
          fill="#000000"
          fontFamily="Helvetica, Arial, sans-serif"
          fontSize="2.1"
          fontWeight="bold"
        >
          TO
        </text>
        <text
          x="83.2"
          y="43.5"
          textAnchor="middle"
          fill="#000000"
          fontFamily="Helvetica, Arial, sans-serif"
          fontSize="4.5"
          fontWeight="bold"
        >
          {data.toJobId}
        </text>
      </svg>
    </div>
  );
};
