import React, { useState, useCallback, useRef } from 'react';
import { FileText, Upload, Printer } from 'lucide-react';
import _ from 'lodash';
import html2pdf from 'html2pdf.js';

const MarkdownPreviewApp = () => {
  const [markdownText, setMarkdownText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  
  // Create a ref for the markdown content
  const printRef = useRef(null);
  
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

  // Generate PDF using html2pdf.js
  const generatePDF = useCallback(() => {
    setIsPrinting(true);
    
    const content = printRef.current;
    
    if (!content) {
      setIsPrinting(false);
      return;
    }
    
    const options = {
      margin: 10,
      filename: 'document.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    html2pdf()
      .set(options)
      .from(content)
      .save()
      .then(() => {
        setIsPrinting(false);
      })
      .catch(error => {
        console.error('PDF generation failed:', error);
        setIsPrinting(false);
      });
  }, []);

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
                disabled={!markdownText || isPrinting}
              >
                {isPrinting ? (
                  <span>Generating PDF...</span>
                ) : (
                  <>
                    <Printer className="w-4 h-4 mr-2" />
                    Download PDF
                  </>
                )}
              </button>
            </div>
            
            {/* Preview container for display */}
            <div className="border border-gray-300 rounded-md shadow-sm p-6 bg-white h-96 overflow-auto">
              {markdownText ? (
                <div 
                  ref={printRef}
                  className="markdown-preview" 
                  dangerouslySetInnerHTML={{ __html: convertMarkdownToHtml(markdownText) }}
                />
              ) : (
                <p className="text-gray-400 text-center mt-20">Preview will appear here</p>
              )}
            </div>
          </div>
        </div>
      </main>
      
      <footer className="bg-gray-100 p-4 border-t border-gray-200 print:hidden">
        <div className="container mx-auto text-center text-gray-600 text-sm">
          <p>Markdown Preview & PDF Converter © 2025</p>
        </div>
      </footer>
    </div>
  );
};

export default MarkdownPreviewApp;