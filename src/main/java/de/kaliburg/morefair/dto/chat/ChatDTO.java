package de.kaliburg.morefair.dto.chat;

import de.kaliburg.morefair.entity.Ladder;
import de.kaliburg.morefair.entity.chat.Message;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class ChatDTO {
    private final Integer currentChatNumber;
    private final List<MessageDTO> messages = new ArrayList<>();

    public ChatDTO(Ladder ladder) {
        currentChatNumber = ladder.getNumber();
        List<Message> sortedMessages = ladder.getMessages();
        sortedMessages.sort((o1, o2) -> o2.getCreatedOn().compareTo(o1.getCreatedOn()));
        for (Message m : sortedMessages) {
            messages.add(m.dto());
        }
    }
}
