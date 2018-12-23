/**
 * Copyright Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Returns the array of cards that should be rendered for the current
 * e-mail thread. The name of this function is specified in the
 * manifest 'onTriggerFunction' field, indicating that this function
 * runs every time the add-on is started.
 *
 * @param {Object} e The data provided by the Gmail UI.
 * @return {Card[]}
 */
function buildAddOn(e) {
  // Activate temporary Gmail add-on scopes.
  var accessToken = e.messageMetadata.accessToken;
  GmailApp.setCurrentMessageAccessToken(accessToken);

  var messageId = e.messageMetadata.messageId;
  var message = GmailApp.getMessageById(messageId);
  
  var thread = message.getThread();
  var messages = thread.getMessages();
  var lastmessage = messages[thread.getMessageCount() - 1 ];
 
  var section = CardService.newCardSection()
    .setHeader("<font color=\"#1257e0\"><b>現在のメール情報</b></font>");       

  var subject = thread.getFirstMessageSubject();   // 件名(スレッドの最初)
  var from = lastmessage.getFrom();                // 送信元(スレッドの最後)
  var plainbody = lastmessage.getPlainBody();      // 本文(スレッドの最後)    

  var splitbody = plainbody.split(/2...年.+?>:/);  //返信時に自動的に入る引用部分を自動挿入の文字列を利用して除外する
  var body = splitbody[0];
  
  var subject_widget = CardService.newKeyValue()
  .setTopLabel("スレッドタイトル")
  .setContent(subject);
  
  var from_widget = CardService.newKeyValue()
  .setTopLabel("最終送信者")
  .setContent(from);             
  
  var body_widget = CardService.newKeyValue()
  .setTopLabel("最終送信本文")
  .setContent(body);

  var button_widget = CardService.newTextButton()
  .setText('Backlog更新')
  .setOnClickAction(CardService.newAction()
                    .setFunctionName('accessBacklog')
                    .setParameters({'subject': subject})
                    .setParameters({'body': body})
                    .setParameters({'from': from}));
  
  // セクションに追加することでウィジェットを有効にする
  section.addWidget(subject_widget);
  section.addWidget(from_widget);
  section.addWidget(body_widget);
  section.addWidget(button_widget);

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
  
// BacklogAPIにアクセス
// コールバックとして ActionResponseを返す
function accessBacklog(e){
  var subject = e.parameters['subject'];
  var body = e.parameters['body'];
  var from = e.parameters['from'];
  var msg;
  
  var id = getIssueId(subject);
 
  if ( isCompleteStatus(id)) {
    msg =  "既に課題がクローズしています";  // 既に課題がクローズしているので何もしない 
  } else {
    msg =  "課題をクローズしました(未実装)";
  }
  
  // gmailの下部に通知を出す
  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification()
                   .setType(CardService.NotificationType.INFO)
                   .setText(msg))
    .build();
}

// 課題のステータスを取得し完了であるか確認する
function isCompleteStatus(id){
   var url = "https://" + spaceurl + "/api/v2/issues/" + id + "?apiKey=" + apikey;
  
  var res= JSON.parse(UrlFetchApp.fetch(url));
  
  //4は｢完了｣
  return res.status.id == "4";
}

// メールタイトルに一致する課題IDを取得
function getIssueId(subject){
  
  var url = "https://" + spaceurl + "/api/v2/issues?apiKey=" + apikey + "&projectId[]=2200&keyword=" + subject;
  
  var res= JSON.parse(UrlFetchApp.fetch(url));
  return res[0].id;
}



// 課題のコメント欄にメール内容を転載
function addComment(id,from,body){
  
}

// 課題のステータスを完了させる
function completeStatus(id){
  
}

function testAPI(){
  Logger.log(isCompleteStatus(getIssueId("【質問】返品、再売上のHCC引継ぎについて")));
  Logger.log(isCompleteStatus(getIssueId("【M企】新商品登録で商品画像の登録ができません")));
}
