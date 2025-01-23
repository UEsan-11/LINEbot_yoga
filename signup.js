// @FUMOsan
// *
// * 主要是因為很喜歡瑜伽課，然後想幫忙老師，所以弄個side project 
// * Program Name: LineBot with Google apps script //
// * Author: Yui Lin
// * Description: This LINE bot is designed to record the users who send messages in a chat room or group. The data is stored in a Google Sheet and is built using App Script.
// * Last Updated: September 1, 2024 
// *


var CHANNEL_ACCESS_TOKEN = 'xxxx'; // LINE Bot API Token

// for debugging
  Logger.log(msg);
  console.log(msg);


  

// 取得工作表物件，僅需取得一次

//const reserve_list = getSheetByName(SpreadSheet, '上課');
//const courseList = getSheetByName(SpreadSheet, '課程表');
//const signupList = getSheetByName(SpreadSheet, '報名');




//接收 Line 訊息並進行分析
function doPost(e) {
  // 解析傳入的 POST 資料
  var msg = JSON.parse(e.postData.contents); 
  
  const sheet_url = 'https://docs.google.com/spreadsheets/d/xxxxx/';
    
  const SpreadSheet = SpreadsheetApp.openByUrl(sheet_url);
  const reserve_list = SpreadSheet.getSheetByName(sheet_name);
  const sheet_name = '上課';



   //查userid 用
    const replyToken = msg.events[0].replyToken;
    const user_id = msg.events[0].source.userId; //用來抓使用者
    const userMessage = msg.events[0].message.text;
    const event_type = msg.events[0].source.type; 


  
    
   // 人數限制用 
   //const maxium_member = 6; //maxium_member : 人數上限
   //const waiting_start = maxium_member+1;  //waiting_start : 候補人數開始的欄位，無需修改
   //const waiting_member = 1;  //waiting_member : 開放候補人數


    // 宣告參數
    var current_hour = Utilities.formatDate(new Date(), "Asia/Taipei", "HH"); // 取得執行時的當下時間
    var current_list_row = reserveList.getLastRow(); // 取得工作表最後一欄（ 直欄數 ）
    var reply_message = []; // 空白回覆訊息陣列，後期會加入 JSON
    var timestamp = Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd HH:mm:ss"); // 取得當前時間戳

    // 查詢傳訊者的 LINE 帳號名稱
    function get_user_name() {
        // 判斷為群組成員還是單一使用者
        switch (event_type) {
            case "user":
                var nameurl = "https://api.line.me/v2/bot/profile/" + user_id;
                break;
            case "group":
                var groupid = msg.events[0].source.groupId;
                var nameurl = "https://api.line.me/v2/bot/group/" + groupid + "/member/" + user_id;
                break;
        }

        try {
            //  呼叫 LINE User Info API，以 user ID 取得該帳號的使用者名稱
            var response = UrlFetchApp.fetch(nameurl, {
                "method": "GET",
                "headers": {
                    "Authorization": "Bearer " + CHANNEL_ACCESS_TOKEN,
                    "Content-Type": "application/json"
                },
            });
            var namedata = JSON.parse(response);
            var reserve_name = namedata.displayName;
        }
        catch {
            reserve_name = "not avaliable";
        }
        return String(reserve_name)
    }

  // 回傳訊息給line 並傳送給使用者
    function send_to_line() {
        var url = 'https://api.line.me/v2/bot/message/reply';
        UrlFetchApp.fetch(url, {
            'headers': {
                'Content-Type': 'application/json; charset=UTF-8',
                'Authorization': 'Bearer ' + CHANNEL_ACCESS_TOKEN,
            },
            'method': 'post',
            'payload': JSON.stringify({
                'replyToken': replyToken,
                'messages': reply_message,
            }),
        });
    }

  // 將輸入值 word 轉為 LINE 文字訊息格式之 JSON
    function format_text_message(word) {
        let text_json = [{
            "type": "text",
            "text": word
        }]

        return text_json;
    }

    
    var reserve_name = get_user_name();

    if (typeof replyToken === 'undefined') {
        return;
    };
    
    // 學生功能--簽到上課以作計算，檢查訊息是否以 " 簽到" 的格式結尾
    var sign_in_pattern = /(簽到|到)$/;  // 這裡的正則表達式檢查訊息是否以 "簽到" 結尾

      if (sign_in_pattern.test(userMessage)) {
        // 將使用者名稱和時間戳寫入工作表
        reserve_list.getRange(current_list_row + 1, 1).setValue(reserve_name);  // 這裡寫入使用者名稱
        reserve_list.getRange(current_list_row + 1, 2).setValue(timestamp);   // 這裡寫入時間戳
        current_list_row = reserveList.getLastRow();

        // 回覆訊息給使用者
        
        reply_message = format_text_message(reserve_name + " 已簽到成功 🙆 上課囉");
    
        send_to_line();
    
      } 

       //else {
       // 如果格式不正確，回覆錯誤訊息
      //  reply_message = format_text_message("請輸入正確格式，例如：'xxx 簽到or XXX 到'");
        
      //  send_to_line();
      // }


    // 學生補簽的功能，作日期檢查 (結尾為 "補簽")
    var make_up_sign_pattern = /(\d{1,2}\/\d{1,2})\s*補簽$/;

    if (make_up_sign_pattern.test(userMessage)) {
    var make_up_date_raw = userMessage.match(make_up_sign_pattern)[1];  // 提取 m/d
    var current_year = new Date().getFullYear();  // 取得今年的年份
    var make_up_date = new Date(`${current_year}/${make_up_date_raw}`);  // 組合成完整日期

    // **新增日期檢查邏輯**
    // 確認組合後的月份與日期是否正確 (避免使用者輸入無效日期，如 2/30)
    if (
        make_up_date.getMonth() + 1 !== parseInt(make_up_date_raw.split('/')[0]) ||
        make_up_date.getDate() !== parseInt(make_up_date_raw.split('/')[1])
    ) {
        reply_message = format_text_message("❌ 日期錯誤，請確認是否為有效日期！");
        send_to_line();
        return;  // 停止後續執行
    }

    var formatted_date = Utilities.formatDate(make_up_date, "GMT+8", "yyyy/MM/dd");
    var all_data = reserveList.getRange(1, 1, current_list_row, 2).getValues();
    var already_signed = false;

    // **檢查是否已有該日期的簽到記錄**
    for (var i = 0; i < all_data.length; i++) {
        var record_date = Utilities.formatDate(new Date(all_data[i][1]), "GMT+8", "yyyy/MM/dd");
        if (record_date === formatted_date && all_data[i][0] === reserve_name) {
            already_signed = true;
            break;
        }
    }

    if (already_signed) {
        reply_message = format_text_message(`${reserve_name} 已於 ${formatted_date} 簽到過，無需補簽 😎`);
    } else {
        // **新增補簽記錄**
        reserveList.getRange(current_list_row + 1, 1).setValue(reserve_name);
        reserveList.getRange(current_list_row + 1, 2).setValue(`${formatted_date} 00:00:00`);
        current_list_row = reserveList.getLastRow();

        reply_message = format_text_message(`${reserve_name} 補簽 ${formatted_date} 成功 🎉`);
    }

    send_to_line();  // 傳送回覆訊息
    }


      // 老師的功能之一--查詢同學上課名單
      else if (userMessage.startsWith("查名單")) {
      // 從訊息中提取日期，假設格式為 "查名單 YYYY/MM/DD"
      var input_date = userMessage.split(" ")[1];  // 取得 YYYY/MM/DD 部分
      
      // 檢查日期是否存在，否則默認為今天
      var query_date;
      if (input_date) {
          query_date = input_date;
      } else {
          var today = new Date();  // 取得今天的日期
          query_date = Utilities.formatDate(today, "GMT+8", "yyyy/MM/dd");  // 格式化為 "yyyy/M/d"
      }

      // 將日期添加到名單標題
      var ready_namelist = "【 " + query_date + " 上課名單 】\n";
      
      // 取得 USERNAME 和 日期時間
      var all_data = reserveList.getRange(1, 1, current_list_row, 2).getValues();
      var selected_members = [];

      for (var x = 0; x < all_data.length; x++) {
          var username = all_data[x][0];  // 取得 USERNAME
          var date_time = all_data[x][1];  // 取得日期時間
          
          // 提取日期部分進行比對
          var record_date = Utilities.formatDate(new Date(date_time), "GMT+8", "yyyy/MM/dd");

          if (record_date == query_date) {
              selected_members.push(username);
          }
      }

      // 如果日期格式不正確，給予提示
      if (!query_date) {
        reply_message = [
          {
            "type": "text",
            "text": "請輸入正確的日期格式 (例如：查名單 2024/09/11)"
          }
        ];

        send_to_line();
        return;
      }


      // 確認學員名單符合
      if (selected_members.length > 0) {
          for (var i = 0; i < selected_members.length; i++) {
              ready_namelist = ready_namelist + "\n" + selected_members[i];
          }
      } else {
          ready_namelist = ready_namelist + "\n" + "該日尚無學員上課";
      }

      reply_message = [
          {
              "type": "text",
              "text": query_date + " 共有 " + selected_members.length + " 位同學上課 ✋"
          },
          {
              "type": "text",
              "text": ready_namelist
          }
      ];

      send_to_line();
      }
     




    // 貼圖時間
    else if (userMessage == "貼圖") {
        reply_message = [{
            "type": "sticker",
            "packageId": "6136",
            "stickerId": "10551378"
        }]

        send_to_line();
    }

   // 其他非關鍵字的訊息則不回應（ 避免干擾群組聊天室 ）
   else {
        console.log("else here,nothing will happen.")
    }

  }
