/* Test method, calls courseInfoRetrieve method with 4 arguments, major, course number, section number and term selection
 *                                                     uppercase 'CSC'    '4350'           '9'          'future' or 'current'
 * Need to add: term selection to differentiate between future semester tracker and current semester tracker
 *
 * Inner function run() will attempt to retrieve course information n number of times if timeouts occur
 * if the website timesout it will return string 'timeout'
 * If data provided by user is invalid then courseInfoRetrieve() will return with string 'invalid'
 * If data provided by user is valid and scraper works successfully then courseInfoRetieve() will return with 
 * an array of strings where each element is important information about the course.
 */
// courseInfoRetrieve('CSC','4350','6','future').then((var1) => { //replace 'csc' '4350' '6' and 'future' with variables
//     console.log(var1);
// });

module.exports = {
    courseInfoRetrieve: async function(cAbbr,cNum,cID,cTerm){
        const puppeteer = require('puppeteer-core');
        const {TimeoutError} = require('puppeteer-core/Errors');
        const chromium = require('chrome-aws-lambda');
        // const launchChrome = require('@serverless-chrome/lambda');
        var rowSID = -1, courseExists;

        async function run(n) {
            const browser = await puppeteer.launch({
                args: chromium.args,
                executablePath: await chromium.executablePath,
                headless: chromium.headless,
                puppeteer: chromium.puppeteer
            });

            const page = await browser.newPage();

            //var dateComp = await getCurrentDate();
            var term = await getTerm();
            // Wait for search results page to load
            
            try {
                await page.goto('https://www.gosolar.gsu.edu/bprod/bwckschd.p_disp_dyn_sched', {waitUntil: 'load'});
                console.log(page.url());
                //console.log("date: " + dateComp);

                /* selects august 2018 semester (current semester tracker) if provided string 'current'
                * selects spring 2019 semester (future course tracker) if provided string 'future'
                */
                console.log("term: " + term);
                await page.select('select', term);   //selects spring 2019 semester (course tracker) if provided digit 1
                await page.$eval('form', form => form.submit()); //clicks submit
                
                await page.waitForSelector('#levl_id', {timeout: 5000}); //waits for page to load
                console.log('FOUND!', page.url());

                await page.select('#levl_id', 'US');  //selects undergrad degree
                await page.select('#subj_id', cAbbr); //selects major

                await page.waitForSelector('#crse_id', {timeout: 5000});
                await page.type('input[name="sel_crse"]', cNum, {delay: 500})
                await page.$eval('form', form => form.submit());

                // Extract the results from the page, if course number is invalid then return 'invalid', if page times out return 'timeout'
                // otherwise continue scraping
                console.log('FOUND!', page.url()); 
                await page.waitForSelector('.pldefault', {timeout: 5000});
                courseExists = (await page.content()).match(/no classes/i); 
                await page.waitForSelector('.dddefault', {timeout: 5000});

                const data = await page.evaluate(() => {
                    const tds = Array.from(document.querySelectorAll('tr > td.dddefault'))
                    return tds.map(td => td.innerText)
                });

                await browser.close();
                return data;
            } catch (e) {
                if (e instanceof TimeoutError) {
                    console.log('Error timeout');
                    if((courseExists != null) && (courseExists[courseExists.length-1] === "No classes"))
                    {
                        await browser.close();
                        return "invalid";
                    }
                    await browser.close();                  
                    if(n === 0) 
                        return "timeout";
                    else
                        return await run(--n);    
                            
                    //return "timeout";
                }else{                
                    await browser.close(); 
                    if(n === 0) 
                        return "timeout";
                    else
                        //Placeholder, might be more types of errors to handle differently. If not then just treat all errors as timeout
                        return await run(--n);                     
                }
            }   
        }

        function getTerm(){
            if(cTerm === 'future')
                return '201901';
            else
                return '201808';
        }

        /*
        function getCurrentDate(){
            var dateObj = new Date();
            var mm = dateObj.getMonth()+1;
            if(mm<10){ mm = '0'+mm}
            const dateComp = dateObj.getFullYear() + '' + (mm);

            return dateComp;
        }*/

        //Try n times, if n number of timeouts occur return 'timeout' else return valid data or 'invalid'
        data = await run(3); 

        if(data === "invalid" || data === "timeout")
        {
            return data;
        }else if(data.length > 20)
        {  
            /* data var is an array of all elements in the table and there are 21 elements per row so this code 
            * breaks the data into a multi-dimensional array for easier parsing.
            */
            numOfCourses = data.length / 21;  //There are 21 elements per row, this calculates how many courses there are
            var allCoursesInfoArray = new Array(numOfCourses);
            for(h = 0, index = 0; h < numOfCourses; h++){
                allCoursesInfoArray[h] = new Array(numOfCourses);
                for(i = 0; i < 21; i++, index++){   
                    allCoursesInfoArray[h][i] = data[index];             
                    if((i === 5) && (allCoursesInfoArray[h][i].replace('\t','').replace(/^0+(?!$)/, "") === cID)){                    
                        rowSID = h; 
                    }else if((h == numOfCourses-1) && (i > 5) && (rowSID === -1))
                        return "invalid section";
                }
            }      

            /*
            *   courseInfoArray contains all relevant course information. 
            *   The data is parsed and stored in this string array
            */
            var courseInfoArray = new Array(0);
            for(i = 0; i < 21; i++){   
                switch(i){
                    case 0: //course open/closed/unkown status                        
                        if(allCoursesInfoArray[rowSID][i].replace('\t','') == "Closed"){
                            courseInfoArray.push("closed");
                        }else if(allCoursesInfoArray[rowSID][i].replace('\t','') == "Open"){
                            courseInfoArray.push("open");
                        }else{ courseInfoArray.push("unknown"); }
                        break;
                    case 2: //course CRN ex: '15114'
                        allCoursesInfoArray[rowSID][i].replace(/(.*?)(\s)+/, function(_, match){
                            courseInfoArray.push(match);
                        });
                        //courseInfoArray.push(allCoursesInfoArray[rowSID][i]);                    
                        break;
                    case 3: //abbreviate of major ex: 'CSC' for computer science
                        courseInfoArray.push(allCoursesInfoArray[rowSID][i].replace('\t',''));
                        break;
                    case 4: //course number ex: '4350'
                        courseInfoArray.push(allCoursesInfoArray[rowSID][i].replace('\t',''));
                        break;    
                    case 5: //course section ID ex: '3'
                        allCoursesInfoArray[rowSID][i].replace('\t','').replace(/\b0*([1-9][0-9]*|0)\b/g, function(_, match){
                            courseInfoArray.push(match);
                        });
                        break;
                    case 8: // full name of course ex: 'SOFTWARE ENGINEERING-CTW'
                        //allCoursesInfoArray[rowSID][i].replace(/\>(.*?)\</, function(_, match){
                        //    courseInfoArray.push(match);
                        //});                    
                        courseInfoArray.push(allCoursesInfoArray[rowSID][i].replace('\t',''));
                        break;
                    case 9: // Days course held or tba ex: 'MW' or 'TR' or can be 'tba'                    
                        if(allCoursesInfoArray[rowSID][i].replace('\t','') == "TBA"){                        
                            courseInfoArray.push("tba");                    
                        }else{
                            courseInfoArray.push(allCoursesInfoArray[rowSID][i].replace('\t',''));                        
                        }
                        break;
                    case 10: //course start/end hours or TBA  ex: start time '2:45 pm' as one array element and 
                            //end time '4:30 pm' as the immediately following array element. If TBA then both elements are 'tba'
                        //courseInfoArray.push(allCoursesInfoArray[rowSID][i].replace(/(&nbsp;)+/g," "));                                        
                        if(allCoursesInfoArray[rowSID][i].replace('\t','') == "TBA"){                        
                            courseInfoArray.push("tba");
                            courseInfoArray.push("tba");
                        }else{
                            //tempStr = allCoursesInfoArray[rowSID][i].replace(/(&nbsp;)+/g," ");
                            allCoursesInfoArray[rowSID][i].replace(/0?(.*)-/, function(_, match){
                                courseInfoArray.push(match);
                            });
                            allCoursesInfoArray[rowSID][i].replace(/-0?(.*)/, function(_, match){
                                courseInfoArray.push(match.replace('\t',''));
                            });
                        }
                        break;
                    case 13:    //Seats remaining
                        courseInfoArray.push(allCoursesInfoArray[rowSID][i].replace('\t',''));
                        break;
                    case 18:  //Name of professor or staff             
                        if(allCoursesInfoArray[rowSID][i].replace('\t','') == "Staff"){
                            courseInfoArray.push("staff");
                        }else{
                            allCoursesInfoArray[rowSID][i].replace(/(.*?)(\(P\))+/g, function(_, match){
                                courseInfoArray.push(match.replace(/^\s+|\s+$/g, ''));
                            });
                        }
                        break;
                    case 20: //Course location and room number. location is one element and room number is the next element in array.
                            //so one element would be 'langdale hall' and the following element in array is '227'. If no location/room number
                            //provided then both elements will be 'tba' or 'na'
                        if(allCoursesInfoArray[rowSID][i].replace('\t','') == "Not Applicable"){
                            courseInfoArray.push("na");
                            courseInfoArray.push("na");
                        }else if(allCoursesInfoArray[rowSID][i].replace('\t','') == "TBA"){
                            courseInfoArray.push("tba");
                            courseInfoArray.push("tba");
                        }else{
                            allCoursesInfoArray[rowSID][i].replace(/([^0-9]+)/g, function(_, match){
                                courseInfoArray.push(match.replace(/^\s+|\s+$/g, ''));
                            });
                            allCoursesInfoArray[rowSID][i].replace(/([0-9]+)/g, function(_, match){
                                courseInfoArray.push(match);
                            });
                        }
                        break;
                }
            }
            
            for(i = 0; i < courseInfoArray.length; i++){
                console.log(i + ". " + courseInfoArray[i]);
            }
            //console.log(courseInfoArray);
            //console.log("date: " + dateComp);
            return courseInfoArray;
        }else
        return data;   
        }
};