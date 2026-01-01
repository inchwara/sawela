import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import apiCall from "@/lib/api";

// This is a placeholder for a PDF generation library.
// In a real application, you would use a library like `puppeteer` or `html-pdf`
// on a serverless function or dedicated backend to generate PDFs.
// For this example, we'll simulate a PDF URL.

export async function POST(request: NextRequest) {
  try {
    const { invoiceId } = await request.json();

    if (!invoiceId) {
      return NextResponse.json(
        { error: "Invoice ID is required" },
        { status: 400 }
      );
    }

    // Fetch invoice data from API
    const invoiceData = await apiCall(`/invoices/${invoiceId}`, "GET");
    
    if (!invoiceData) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Generate HTML content for the invoice
    const htmlContent = generateInvoiceHTML(invoiceData);

    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    // Generate PDF
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        right: "20mm",
        bottom: "20mm",
        left: "20mm",
      },
    });

    await browser.close();

    // Return PDF as response
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${invoiceId}.pdf"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to generate PDF" },
      { status: 500 }
    );
  }
}

function generateInvoiceHTML(invoiceData: any) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice ${invoiceData.invoice_number}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
          }
          .invoice-details {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
          }
          .customer-info, .invoice-info {
            flex: 1;
          }
          .invoice-info {
            text-align: right;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
          }
          th {
            background-color: #f8f9fa;
            font-weight: bold;
          }
          .total {
            text-align: right;
            font-weight: bold;
            font-size: 18px;
          }
          .footer {
            margin-top: 50px;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>INVOICE</h1>
          <h2>${invoiceData.company_name || "Your Company"}</h2>
        </div>
        
        <div class="invoice-details">
          <div class="customer-info">
            <h3>Bill To:</h3>
            <p>${invoiceData.customer_name || "Customer Name"}</p>
            <p>${invoiceData.customer_email || "customer@example.com"}</p>
            <p>${invoiceData.customer_phone || "Phone Number"}</p>
          </div>
          <div class="invoice-info">
            <h3>Invoice Details:</h3>
            <p><strong>Invoice #:</strong> ${invoiceData.invoice_number}</p>
            <p><strong>Date:</strong> ${new Date(invoiceData.created_at).toLocaleDateString()}</p>
            <p><strong>Due Date:</strong> ${new Date(invoiceData.due_date).toLocaleDateString()}</p>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Description</th>
              <th>Quantity</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${invoiceData.items?.map((item: any) => `
              <tr>
                <td>${item.name || "Item"}</td>
                <td>${item.description || ""}</td>
                <td>${item.quantity}</td>
                <td>Ksh. ${(item.price?.toFixed(2) || "0.00")}</td>
                <td>Ksh. ${((item.quantity || 0) * (item.price || 0)).toFixed(2)}</td>
              </tr>
            `).join("") || ""}
          </tbody>
        </table>
        
        <div class="total">
          <p><strong>Subtotal:</strong> Ksh. ${invoiceData.subtotal?.toFixed(2) || "0.00"}</p>
          <p><strong>Tax:</strong> Ksh. ${invoiceData.tax?.toFixed(2) || "0.00"}</p>
          <p><strong>Total:</strong> Ksh. ${invoiceData.total?.toFixed(2) || "0.00"}</p>
        </div>
        
        <div class="footer">
          <p>Thank you for your business!</p>
          <p>Please pay within ${invoiceData.payment_terms || "30"} days</p>
        </div>
      </body>
    </html>
  `;
}
