const { Pool } = require('pg'); 
// const client = Client(); 
// await client.connect(); 

const pool = new Pool({
 user: 'gyukio',
 host: 'localhost',
 database: 'test',
 port: 5432,
})
  
/* 
    Prompt
Please write a query to answer each of the following questions. Both accuracy and query performance are critical.
Please document any assumptions you make in addressing these questions.
1. Write a SQL query to find the ids of all documents which do not have any pages.
2. Write a SQL query which returns a list of report titles and the total number of pages in the
report. reports which do not have pages may be ignored.
3. Assume a new feature needs to be developed to allow commenting on reports, documents, and
pages. How would you implement support for this in the schema, and what considerations would you have in determining your approach?

*/ 
// 1. 

// implements as if we were using node-postgres 
const findDocumentsNoPages = async () => {
  try {
        const findDocs = `SELECT documents.id 
                          FROM documents
                            LEFT JOIN pages AS pgs ON pgs.document_id = documents.id
                          WHERE pgs.document_id IS NULL;`; 
        const res = await pool.query(findDocs); 
        return res; 
  } catch (error) {
      return error; 
  }
}

findDocumentsNoPages()
.then((res) => console.log('This is our findDocumentsNoPages res ', res))
.catch((error) => console.log('This is our error ', error)); 

// 2. 
// Query assumes we want every report
const listReportTitlesAndPages = async () => {
  try { 
      const listReports = `SELECT reports.title, COUNT(pages.document_id) AS num_pages 
                                FROM reports, pages, documents 
                           WHERE documents.report_id = reports.id AND documents.id = pages.document_id 
                           GROUP BY reports.title`
      const res = await pool.query(listReports); 
      return res; 
  } catch (error) { 
      return error; 
  }
}

listReportTitlesAndPages()
.then((res) => console.log('This is the listReportTitlesAndPages res ', res))
.catch((error) => console.log('This is our error ', error)); 

 
// 3. 
    /*
        I would create a new table called comments: 
        
        CREATE TABLE comments { 
          id BIGSERIAL NOT NULL PRIMARY KEY 
          text VARCHAR(180) NOT NULL 
          report_id BIGSERIAL NULL FOREIGN KEY 
          document_id BIGSERIAL NULL FOREIGN KEY 
          page_id BIGSERIAL NULL FOREIGN KEY 
        }

        This table is constructed in the above form because the following constraint: 
        - All non-primary key database columns default to NULL 

        If the comment is made on a report the report_id will be non-null, 
        If the comment is made on a document the document_id will be non-null, 
        If the comment is made on a page the page_id will be non-null 
        Each comment will have either a report_id or document_id or page_id 

   */ 
/*
              PART2
                   
              Prompt
Given a store like the example in Appendix B, 
please answer the following questions using vanilla ES6+ Javascript. 
You may define and reuse auxiliary functions to aid your responses.
                        
*/


const store = { 
    document: {
        8: { id: 8, report_id: 4, name: 'Sample Document', filetype: 'txt' },
        34: { id: 34, report_id: 21, name: 'Quarterly Report', filetype: 'pdf' }, 
        87: { id: 87, report_id: 21, name: 'Performance Summary', filetype: 'pdf' },
    }, 
    page: {
       19: { id: 19, document_id: 34, body: 'Lorem ipsum...', footnote: null },
       72: { id: 72, document_id: 87, body: 'Ut aliquet...', footnote: 'Aliquam erat...' },
       205: { id: 205, document_id: 34, body: 'Donec a dui et...', footnote: null },
    }, 
    report: {
       4: { id: 4, title: 'Sample Report' },
       21: { id: 21, title: 'Portfolio Summary 2020' },
    } 
}


const getIdKeys = (reports, documents, pages) => {
    const reportIds = Object.keys(reports); 
    const docIds = Object.keys(documents); 
    const pageIds = Object.keys(pages); 
    return { 
      reportIds,
      docIds,
      pageIds
    }
}

// O(n^2)
const pagesPerReport = (store) => {
    const { report, document, page } = store; 
    const { reportIds, docIds, pageIds } = getIdKeys(report,document,page);

    const docToReport = docIds.reduce((acc,id) => {
      const { report_id } = document[id];
      return { ...acc, [id]:report_id }; 
    }, {}); 
    
    const reportPageCount = {}; 
    for (let rId of reportIds) { 
        const reportId = parseInt(rId); 
        reportPageCount[reportId] = 0; 
        for (let pId of pageIds) {
          const { document_id } = page[pId]; 
          if (document_id in docToReport && docToReport[document_id] === reportId) { 
              const id = docToReport[document_id]; 
              reportPageCount[id] += 1; 
          }
        }
    }
    return reportPageCount; 
}


console.log('Pages Per Report , ', pagesPerReport(store));


// Assumes we are returning the reports of all matches
// returns a list containing:
// the report that has the matching string,
// the report related to the document if a document 
// has the matching string and the report related 
// to the page if the page has a matching string
// Potential changes would be to return the list of related reports 
// as soon as a match is found in reports, documents, or pages 
// O(n) 
const search = (searchString, store) => {
    const { report, document, page } = store; 
    const { reportIds, docIds, pageIds } = getIdKeys(report,document,page);
    // Searches report titles 
    const reportIdList = reportIds.filter((id) => {
      const { title } = report[id];  
      return title.includes(searchString); 
    }); 

    // Searches document names 
    const docReportIds = docIds.map((id) => {
      const { name, report_id } = document[id]; 
      if (name.includes(searchString)) {
        return report_id;  
      }
    }).filter((id) => id !== undefined); 

    // Searches page body and footnote
    const pageReportIds = pageIds.map((id) => {
      const { body, footnote, document_id } = page[id]; 
      if (body.includes(searchString) 
          || (footnote !== null && footnote.includes(searchString))) {
        return document_id; 
      }
    }).map((id) => {
      if (id !== undefined) {
       return document[id].report_id
      } 
    }).filter((id) => id !== undefined); 
    
    // Builds list of relevant reportIds 
    let allReportIds = []; 
    if (reportIdList.length && docReportIds.length && pageReportIds.length) { 
      allReportIds = [...reportIdList, ...docReportIds, ...pageReportIds]; 
    } else if (reportIdList.length && docReportIds.length) {
      allReportIds = [...reportIdList, ...docReportIds]; 
    } else if (reportIdList.length && pageReportIds.length) {
      allReportIds = [...reportIdList, ...docReportIds]; 
    } else if (docReportIds.length && pageReportIds.length) {
      allReportIds = [...docReportIds, ...pageReportIds]; 
    } else if (reportIdList.length) {
      allReportIds = [...reportIdList]; 
    } else if (docReportIds.length) {
      allReportIds = [...docReportIds]; 
    } else if (pageReportIds.length) {
      allReportIds = [...pageReportIds]; 
    }

    // Builds list of relevant reports 
    if (allReportIds.length) {
      const _reports = allReportIds.map((id) => {
        return report[id]; 
      })
      return _reports; 
    }
    return []; 
}
console.log(`Search function... `, search(`Lorem`, store)); 

// Function returns a Promise 
const asyncSearch = async (searchString) => {
    // Ignore body as per instructions 
    return; 
}


class UserError extends Error {
  constructor (code) {
    this.code = code; 
  }
}

const getSearchResults = async (searchString) => {
    try {
        const searchRes = await asyncSearch(searchString); 
        return searchRes; 
    } catch (error) {
        if (error instanceof UserError) {
            displayUserSearchError(error); 
            return error; 
        }
        console.log(`Error searching for ${searchString} ...`, error); 
        return error
    }
}

/* 
   a.
    The function will now return a Promise object because it has become asynchronous.
    We would additionally no longer be passing in the store object as a parameter.    

   b. 
    I would handle any errors that arose in the asynchronous function in a 
    in a try...catch block of code.  Depending on the error type, I would either set up 
    logging for the developer or begin a UI action to inform the user of the error.  
*/ 




