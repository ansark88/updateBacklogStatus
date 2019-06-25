function buildAddOn(e) {
  // Activate temporary Gmail add-on scopes.
  var accessToken = e.messageMetadata.accessToken;
  GmailApp.setCurrentMessageAccessToken(accessToken);

  var messageId = e.messageMetadata.messageId;
  var message = GmailApp.getMessageById(messageId);

  var thread = message.getThread();
  var messages = thread.getMessages();

  var section = CardService.newCardSection()
    .setHeader("<font color=\"#1257e0\"><b>現在のメール情報</b></font>");

  var subject = thread.getFirstMessageSubject();   // 件名(スレッドの最初)
  var from = message.getFrom();                // 送信元(スレッドの選択位置)
  var plainbody = message.getPlainBody();      // 本文(スレッドの選択位置)    

  var splitbody = plainbody.split(/2...年.+?>:/);  //返信時に自動的に入る引用部分を自動挿入の文字列を利用して除外する
  var body = splitbody[0];

  var subject_widget = CardService.newKeyValue()
    .setTopLabel("スレッドタイトル")
    .setContent(subject);

  var from_widget = CardService.newKeyValue()
    .setTopLabel("送信者")
    .setContent(from);

  var body_widget = CardService.newKeyValue()
    .setTopLabel("送信本文")
    .setContent(body);

  var button_widget = CardService.newTextButton()
    .setText('Backlog更新')
    .setOnClickAction(CardService.newAction()
      .setFunctionName('accessBacklog')
      .setParameters({ 'subject': subject })
      .setParameters({ 'body': body })
      .setParameters({ 'from': from }));

  var open_backlog_btn_widget = CardService.newTextButton()
    .setText('Backlogを開く')
    .setOnClickAction(CardService.newAction()
      .setFunctionName('openBacklog')
      .setParameters({ 'subject': subject }));

  var issue_types  = CardService.newSelectionInput()
    .setTitle("変更する種別選択")
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setFieldName('issue_type')
    .setOnChangeAction(CardService.newAction()
                       .setFunctionName('changeBacklog')
                       .setParameters({ 'subject': subject }));

  
  //種別プルダウンの作成
  var types = getIssueTypes(); 
  issue_types.addItem('変更なし','0', true);
  for(var i = 0; i < types.length; i++) {
    issue_types.addItem(types[i]['name'], types[i]['id'], false);
  }
  
  // セクションに追加することでウィジェットを有効にする
  section.addWidget(subject_widget);
  section.addWidget(from_widget);
  section.addWidget(body_widget);
  section.addWidget(issue_types);
  section.addWidget(button_widget);
  //section.addWidget(open_backlog_btn_widget);

  // Build the main card after adding the section.
  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('Backlogステータス更新')
      .setImageUrl('https://www.gstatic.com/images/icons/material/system/1x/label_googblue_48dp.png'))
    .addSection(section)
    .build();

  return [card];
}

spaceurl = PropertiesService.getScriptProperties().getProperty('spaceurl');
apikey = PropertiesService.getScriptProperties().getProperty('apikey');
BACKLOG_PROJECT_ID = '2200'

// BacklogAPIにアクセス
// コールバックとして ActionResponseを返す
function accessBacklog(e) {
  var subject = e.parameters['subject'];
  var body = e.parameters['body'];
  var from = e.parameters['from'];
  var msg;

  var id = getIssueId(subject);

  if (id) {
    if (isCompleteStatus(id)) {
      msg = "既に課題がクローズしています";  // 既に課題がクローズしているので何もしない 
    } else {
      var result = addComment(id, from, body);  //コメントを追加

      if (result) {
        var result2 = completeStatus(id); //ステータス更新

        if (result2) {
          msg = "課題をクローズしました";
        } else {
          msg = "ステータスの更新に失敗しました";
        }
      } else {
        msg = "コメントの追加に失敗しました";
      }
    }
  } else {
    msg = "該当する課題がありません";
  }

  // gmailの下部に通知を出す
  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification()
      .setType(CardService.NotificationType.INFO)
      .setText(msg))
    .build();
}

// BacklogAPIにアクセス
// コールバックとして ActionResponseを返す
function changeBacklog(e) {
  var subject = e.parameters['subject'];
  var issue_type = e.formInputs.issue_type;
  var msg;
  
  var id = getIssueId(subject);
  
  if (id) {
    var result = changeIssueType(id,issue_type); //種別
    
    if (result) {
      msg = "種別を変更しました";
    } else {
      msg = "種別の更新に失敗しました";
    }
  } else {
    msg = "該当する課題がありません";
  }

  // gmailの下部に通知を出す
  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification()
      .setType(CardService.NotificationType.INFO)
      .setText(msg))
    .build();
}

// 課題のステータスを取得し完了であるか確認する
// 使用API https://developer.nulab-inc.com/ja/docs/backlog/api/2/get-issue/
function isCompleteStatus(id) {
  var url = "https://" + spaceurl + "/api/v2/issues/" + id + "?apiKey=" + apikey;

  var res = JSON.parse(UrlFetchApp.fetch(url));

  //4は｢完了｣
  return res.status.id == "4";
}

// 種別一覧を取得
// 使用API https://developer.nulab-inc.com/ja/docs/backlog/api/2/get-issue-list/
function getIssueTypes() {
  var url = "https://" + spaceurl + "/api/v2/projects/" + BACKLOG_PROJECT_ID + "/issueTypes?apiKey=" + apikey;

  var res = JSON.parse(UrlFetchApp.fetch(url));
  return (res.length ? res : null);
}

// メールタイトルに一致する課題IDを取得
// 使用API https://developer.nulab-inc.com/ja/docs/backlog/api/2/get-issue-list/
function getIssueId(subject) {
  var url = "https://" + spaceurl + "/api/v2/issues?apiKey=" + apikey + "&projectId[]=2200&keyword=" + encodeURIComponent(subject);

  var res = JSON.parse(UrlFetchApp.fetch(url));
  return (res.length ? res[0].id : null);
}

// 課題のコメント欄にメール内容を転載
// 使用API https://developer.nulab-inc.com/ja/docs/backlog/api/2/add-comment/
function addComment(id, from, body) {
  var url = "https://" + spaceurl + "/api/v2/issues/" + id + "/comments?apiKey=" + apikey;
  var name = from.replace(/"(.+)".+/, "$1"); //余計な文字を削除

  var param = {
    'content': name + "さん回答済み、クローズ。\n\n```\n" + body + "\n```"
  };

  var options = {
    'method': 'POST',
    'headers': {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    'payload': param
  };

  var res = UrlFetchApp.fetch(url, options);

  return res.getResponseCode() == '201';
}

// 種別の変更
// 使用API https://developer.nulab-inc.com/ja/docs/backlog/api/2/update-issue/
function changeIssueType(id,issue_type){  
  var url = "https://" + spaceurl + "/api/v2/issues/" + id + "?apiKey=" + apikey;
  
  it = String(parseInt(issue_type,10)); // 整数で代入した時点で小数点が入ってしまうので整数化してから文字列に変更している
  var param = {
    'issueTypeId' : it
  };
  
  var options = {
    'method': 'PATCH',
    'headers': {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    'payload': param
  };

  try {
    var res = UrlFetchApp.fetch(url, options);
  } catch(e) {
    Logger.log(e);
    return false;
  }
    
  return res.getResponseCode() == '200';
}

// 課題のステータスを完了させる
// 使用API https://developer.nulab-inc.com/ja/docs/backlog/api/2/update-issue/
function completeStatus(id) {
  var url = "https://" + spaceurl + "/api/v2/issues/" + id + "?apiKey=" + apikey;

  var param = {
    'statusId': "4",  //｢完了｣にする
    'resolutionId': "0" //｢対応済み｣にする
  };

  var options = {
    'method': 'PATCH',
    'headers': {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    'payload': param
  };

  var res = UrlFetchApp.fetch(url, options);

  return res.getResponseCode() == '200';
}

function testAPI() {
  Logger.log( changeIssueType(15493078,9317))
  Logger.log('end')
}

function testNum(){
  test = '9319.0';
  test2 = parseInt(test,10);
  test3 = String(test2);  
  Logger.log(test3)
}
