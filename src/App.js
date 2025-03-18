import React, { useState, useCallback } from 'react';
import { FileText, Download, Upload, Copy } from 'lucide-react';
import _ from 'lodash';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const MarkdownPreviewApp = () => {
  const [markdownText, setMarkdownText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  
  // Handle file drop
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      
      reader.onload = (event) => {
        setMarkdownText(event.target.result);
      };
      
      reader.readAsText(file);
    }
  }, []);
  
  // Handle drag events
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  
  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);
  
  // Handle file selection via input
  const handleFileSelect = useCallback((e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = (event) => {
        setMarkdownText(event.target.result);
      };
      
      reader.readAsText(file);
    }
  }, []);
  
  // Handle text input change
  const handleTextChange = useCallback((e) => {
    setMarkdownText(e.target.value);
  }, []);

  // Generate PDF using jsPDF and html2canvas
  const generatePDF = useCallback(() => {
    const previewElement = document.querySelector('.markdown-preview');
    
    if (!previewElement) return;
    
    // Show a loading indicator
    const loadingText = document.createElement('div');
    loadingText.className = 'absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-10';
    loadingText.innerHTML = '<span class="text-blue-600 font-medium">Generating PDF...</span>';
    previewElement.parentNode.appendChild(loadingText);
    
    try {
      // Prepare content for PDF generation with better styling
      const pdfContent = document.createElement('div');
      pdfContent.innerHTML = previewElement.innerHTML;
      pdfContent.style.width = '816px'; // A4 width at 96 DPI
      pdfContent.style.padding = '48px';
      pdfContent.style.boxSizing = 'border-box';
      pdfContent.style.fontSize = '14px';
      pdfContent.style.lineHeight = '1.5';
      pdfContent.style.fontFamily = 'Arial, Helvetica, sans-serif';
      pdfContent.style.position = 'absolute';
      pdfContent.style.left = '-9999px';
      pdfContent.style.top = '0';
      pdfContent.style.backgroundColor = 'white';
      
      // Apply additional styles for better formatting
      const styles = document.createElement('style');
      styles.textContent = `
        h1, h2, h3, h4, h5, h6 { margin-top: 16px; margin-bottom: 8px; line-height: 1.2; }
        h1 { font-size: 28px; }
        h2 { font-size: 24px; }
        h3 { font-size: 20px; }
        h4 { font-size: 18px; }
        h5 { font-size: 16px; }
        h6 { font-size: 14px; }
        p { margin-bottom: 10px; }
        ul, ol { padding-left: 24px; margin-bottom: 10px; }
        li { margin-bottom: 4px; }
        pre { 
          background-color: #f5f5f5; 
          padding: 12px; 
          border-radius: 4px; 
          overflow-x: auto;
          margin-bottom: 12px;
          font-size: 12px;
          font-family: monospace;
          white-space: pre-wrap;
        }
        code { 
          background-color: #f5f5f5; 
          padding: 2px 4px; 
          border-radius: 3px; 
          font-family: monospace;
          font-size: 12px;
        }
        blockquote {
          border-left: 4px solid #ccc;
          padding-left: 16px;
          margin-left: 0;
          margin-bottom: 12px;
          font-style: italic;
        }
        img { max-width: 100%; }
        a { color: #0066cc; text-decoration: underline; }
        table {
          border-collapse: collapse;
          width: 100%;
          margin-bottom: 16px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        th { background-color: #f2f2f2; }
        .footnotes { 
          margin-top: 24px;
          border-top: 1px solid #eee;
          padding-top: 12px;
        }
      `;
      
      document.body.appendChild(styles);
      document.body.appendChild(pdfContent);
      
      // Function to calculate height and split content for pagination
      const generatePdfWithProperPagination = () => {
        // A4 dimensions at 72 DPI
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'pt',
          format: 'a4'
        });
        
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 40;
        const effectivePageHeight = pageHeight - (margin * 2);
        
        html2canvas(pdfContent, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: 'white',
          scrollY: -window.scrollY
        }).then(canvas => {
          // Calculate necessary parameters
          const imgData = canvas.toDataURL('image/jpeg', 1.0);
          const imgWidth = pageWidth - (margin * 2);
          const imgHeight = canvas.height * (imgWidth / canvas.width);
          
          // Add content to PDF with pagination
          let heightLeft = imgHeight;
          let position = 0;
          let pageNumber = 1;
          
          // Add first page
          pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight);
          heightLeft -= effectivePageHeight;
          
          // Add additional pages if needed
          while (heightLeft > 0) {
            position = -pageNumber * effectivePageHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', margin, position + margin, imgWidth, imgHeight);
            heightLeft -= effectivePageHeight;
            pageNumber++;
          }
          
          // Save the PDF file
          pdf.save('markdown-document.pdf');
          
          // Cleanup
          document.body.removeChild(pdfContent);
          document.body.removeChild(styles);
          if (loadingText) loadingText.remove();
        }).catch(error => {
          console.error('PDF generation error:', error);
          document.body.removeChild(pdfContent);
          document.body.removeChild(styles);
          if (loadingText) loadingText.remove();
          alert('An error occurred while generating the PDF. Please try again.');
        });
      };
      
      // Allow time for content rendering
      setTimeout(generatePdfWithProperPagination, 200);
      
    } catch (err) {
      console.error('Error setting up PDF generation:', err);
      if (loadingText) loadingText.remove();
      alert('Failed to generate PDF. Please try again.');
    }
  }, [markdownText]);

  // Improved Markdown to HTML conversion with footnotes support
  const convertMarkdownToHtml = (markdown) => {
    if (!markdown) return '';
    
    // Track URLs and titles for footnotes
    const footnotes = [];
    
    // Process the markdown line by line for better control
    const lines = markdown.split('\n');
    let html = '';
    let inList = false;
    let inCodeBlock = false;
    let listType = '';
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      
      // Handle code blocks
      if (line.trim().startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          const language = line.trim().slice(3);
          html += `<pre><code class="language-${language}">`;
        } else {
          inCodeBlock = false;
          html += '</code></pre>';
        }
        continue;
      }
      
      if (inCodeBlock) {
        html += line + '\n';
        continue;
      }
      
      // Handle headings
      if (line.startsWith('# ')) {
        html += `<h1 class="text-3xl font-bold mt-6 mb-4">${line.slice(2)}</h1>`;
        continue;
      }
      if (line.startsWith('## ')) {
        html += `<h2 class="text-2xl font-bold mt-5 mb-3">${line.slice(3)}</h2>`;
        continue;
      }
      if (line.startsWith('### ')) {
        html += `<h3 class="text-xl font-bold mt-4 mb-2">${line.slice(4)}</h3>`;
        continue;
      }
      if (line.startsWith('#### ')) {
        html += `<h4 class="text-lg font-bold mt-3 mb-2">${line.slice(5)}</h4>`;
        continue;
      }
      if (line.startsWith('##### ')) {
        html += `<h5 class="text-base font-bold mt-3 mb-1">${line.slice(6)}</h5>`;
        continue;
      }
      if (line.startsWith('###### ')) {
        html += `<h6 class="text-sm font-bold mt-2 mb-1">${line.slice(7)}</h6>`;
        continue;
      }
      
      // Handle lists
      if (line.match(/^\s*(\-|\*|\+)\s/)) {
        if (!inList || listType !== 'ul') {
          if (inList) html += `</${listType}>`;
          html += '<ul class="list-disc pl-5 my-2">';
          inList = true;
          listType = 'ul';
        }
        const content = line.replace(/^\s*(\-|\*|\+)\s/, '');
        html += `<li>${formatInline(content, footnotes)}</li>`;
        continue;
      }
      
      if (line.match(/^\s*\d+\.\s/)) {
        if (!inList || listType !== 'ol') {
          if (inList) html += `</${listType}>`;
          html += '<ol class="list-decimal pl-5 my-2">';
          inList = true;
          listType = 'ol';
        }
        const content = line.replace(/^\s*\d+\.\s/, '');
        html += `<li>${formatInline(content, footnotes)}</li>`;
        continue;
      }
      
      // Close list if needed
      if (inList && line.trim() === '') {
        html += `</${listType}>`;
        inList = false;
      }
      
      // Handle blockquotes
      if (line.startsWith('> ')) {
        html += `<blockquote class="border-l-4 border-gray-300 pl-4 italic my-2">${formatInline(line.slice(2), footnotes)}</blockquote>`;
        continue;
      }
      
      // Handle horizontal rule
      if (line.match(/^(\*\*\*|\-\-\-|\_\_\_)$/)) {
        html += '<hr class="my-4 border-t border-gray-300">';
        continue;
      }
      
      // Handle paragraphs
      if (line.trim() !== '') {
        html += `<p class="my-2">${formatInline(line, footnotes)}</p>`;
      }
    }
    
    // Close any open list
    if (inList) {
      html += `</${listType}>`;
    }
    
    // Add footnotes section if there are any links
    if (footnotes.length > 0) {
      html += `
        <hr class="my-6 border-t border-gray-300">
        <h2 class="text-2xl font-bold mt-6 mb-4">References & Footnotes</h2>
        <div class="footnotes">
          <ol class="list-decimal pl-5">
      `;
      
      // Add each footnote as a list item
      footnotes.forEach((footnote, index) => {
        const displayText = footnote.title ? footnote.title : footnote.url;
        html += `<li id="footnote-${index + 1}" class="my-2">
          <a href="${footnote.url}" target="_blank" class="text-blue-600 hover:underline">${displayText}</a>
        </li>`;
      });
      
      html += `
          </ol>
        </div>
      `;
    }
    
    return html;
  };
  
  // Handle inline formatting
  const formatInline = (text, footnotes) => {
    // Bold
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__(.*?)__/g, '<strong>$1</strong>');
    
    // Italic
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    text = text.replace(/_(.*?)_/g, '<em>$1</em>');
    
    // Strikethrough
    text = text.replace(/~~(.*?)~~/g, '<del>$1</del>');
    
    // Inline code
    text = text.replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 rounded">$1</code>');
    
    // Process links and track them for footnotes
    text = text.replace(/\[(.*?)\]\((.*?)\)/g, (match, linkText, url) => {
      // Add to footnotes
      const footnoteIndex = footnotes.findIndex(fn => fn.url === url);
      let index;
      
      if (footnoteIndex === -1) {
        // New URL
        footnotes.push({
          url,
          title: linkText !== url ? linkText : null
        });
        index = footnotes.length;
      } else {
        // Existing URL
        index = footnoteIndex + 1;
      }
      
      // Create link with footnote reference
      return `<a href="${url}" class="text-blue-600 hover:underline" title="${url}">${linkText}<sup class="text-xs ml-1">[${index}]</sup></a>`;
    });
    
    // Images
    text = text.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="max-w-full my-2">');
    
    return text;
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-gray-800 text-white p-4">
        <div className="container mx-auto flex items-center">
          <FileText className="mr-2" />
          <h1 className="text-xl font-bold">Markdown Preview & PDF Converter</h1>
        </div>
      </header>
      
      <main className="container mx-auto flex-grow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left side - Input */}
          <div className="flex flex-col">
            <div className="mb-4">
              <div 
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer mb-4 ${
                  isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => document.getElementById('file-upload').click()}
              >
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">
                  Drag & drop a markdown file here, or click to select
                </p>
                <input
                  id="file-upload"
                  type="file"
                  accept=".md,.markdown,.txt"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>
            
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Or paste your markdown text:
            </label>
            <textarea
              className="w-full h-96 p-4 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              value={markdownText}
              onChange={handleTextChange}
              placeholder="Type or paste your markdown content here..."
            />
          </div>
          
          {/* Right side - Preview */}
          <div className="flex flex-col">
            <div className="flex justify-between mb-2">
              <h2 className="text-lg font-medium text-gray-700">Preview</h2>
              <button
                onClick={generatePDF}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                disabled={!markdownText}
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </button>
            </div>
            <div className="relative border border-gray-300 rounded-md shadow-sm p-6 bg-white h-96 overflow-auto">
              {markdownText ? (
                <div className="markdown-preview" dangerouslySetInnerHTML={{ __html: convertMarkdownToHtml(markdownText) }} />
              ) : (
                <p className="text-gray-400 text-center mt-20">Preview will appear here</p>
              )}
            </div>
          </div>
        </div>
      </main>
      
      <footer className="bg-gray-100 p-4 border-t border-gray-200">
        <div className="container mx-auto text-center text-gray-600 text-sm">
          <p>Markdown Preview & PDF Converter © 2025</p>
        </div>
      </footer>
    </div>
  );
};

export default MarkdownPreviewApp;