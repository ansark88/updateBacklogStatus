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

  splitbody = plainbody.split(/2...年.+?>:/);  //返信時に自動的に入る引用部分を自動挿入の文字列を利用して除外する
  body = splitbody[0];
  
  var subject_widget = CardService.newKeyValue()
                        .setTopLabel("スレッドタイトル")
                        .setContent(subject);
  
  var from_widget = CardService.newKeyValue()
                        .setTopLabel("最終送信者")
                        .setContent(from);             
  
  var body_widget = CardService.newKeyValue()
                        .setTopLabel("最終送信本文")
                        .setContent(body);

  // セクションに追加することでウィジェットを有効にする
  section.addWidget(subject_widget);
  section.addWidget(from_widget);
  section.addWidget(body_widget);

  // Build the main card after adding the section.
  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
    .setTitle('Backlogステータス更新')
    .setImageUrl('https://www.gstatic.com/images/icons/material/system/1x/label_googblue_48dp.png'))
    .addSection(section)
    .build();

  return [card];
} 

