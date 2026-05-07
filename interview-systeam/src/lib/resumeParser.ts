export async function parseResume(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  try {
    if (extension === 'pdf') {
      return await extractTextFromPDF(file);
    } else if (extension === 'docx' || extension === 'doc') {
      // mammoth works well for docx. For ancient .doc, it might struggle but we'll try our best.
      return await extractTextFromDOCX(file);
    } else {
      throw new Error(`Unsupported file type: ${extension}`);
    }
  } catch (error) {
    console.error("Error parsing resume:", error);
    throw new Error("Failed to read resume file. It might be corrupted or protected.");
  }
}

async function extractTextFromPDF(file: File): Promise<string> {
  // Dynamically import pdfjs-dist to avoid SSR errors (e.g. ReferenceError: DOMMatrix is not defined)
  const pdfjsLib = await import('pdfjs-dist');
  
  // Set up the PDF.js worker using Vite's ?url syntax to guarantee the asset is served correctly
  const workerUrlModule = await import('pdfjs-dist/build/pdf.worker.mjs?url');
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrlModule.default;

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDocument = await loadingTask.promise;
  
  let fullText = '';
  const numPages = pdfDocument.numPages;

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDocument.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + ' \n';
  }

  return fullText;
}

async function extractTextFromDOCX(file: File): Promise<string> {
  // Dynamically import mammoth to avoid SSR errors
  const mammothModule = await import('mammoth');
  const mammoth = mammothModule.default || mammothModule;

  const arrayBuffer = await file.arrayBuffer();
  // We use extractRawText to get pure text content without HTML tags
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}
