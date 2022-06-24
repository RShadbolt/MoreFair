package de.kaliburg.morefair.game;

import de.kaliburg.morefair.account.AccountEntity;
import de.kaliburg.morefair.events.Event;
import de.kaliburg.morefair.game.chat.ChatEntity;
import de.kaliburg.morefair.game.chat.ChatService;
import de.kaliburg.morefair.game.round.LadderService;
import de.kaliburg.morefair.game.round.RankerEntity;
import de.kaliburg.morefair.game.round.RankerService;
import de.kaliburg.morefair.game.round.RoundEntity;
import de.kaliburg.morefair.game.round.RoundService;
import java.util.List;
import javax.annotation.PostConstruct;
import lombok.Getter;
import lombok.extern.log4j.Log4j2;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The GameService that setups and manages the GameEntity. Also routes all the requests for the Game
 * itself.
 *
 * <ul>
 *   <li>{@link LadderService} for game logic, user events and everything that is contained in a
 *   ladder </li>
 *   <li>{@link RoundService} for statistics, global events and other round-specific things</li>
 *   <li>{@link ChatService} for chats and messages</li>
 * </ul>
 */
@Service
@Log4j2
public class GameService {

  private final GameRepository gameRepository;
  private final RoundService roundService;
  private final LadderService ladderService;
  private final RankerService rankerService;
  private final ChatService chatService;
  @Getter
  private GameEntity game;

  GameService(GameRepository gameRepository, RoundService roundService,
      LadderService ladderService, RankerService rankerService, ChatService chatService) {
    this.gameRepository = gameRepository;
    this.roundService = roundService;
    this.ladderService = ladderService;
    this.rankerService = rankerService;
    this.chatService = chatService;
  }

  @PostConstruct
  void initialGameSetup() {
    try {
      List<GameEntity> allGames = gameRepository.findAll();
      game = allGames.isEmpty() ? createGame() : allGames.get(0);
      roundService.loadIntoCache(game.getCurrentRound());
      chatService.loadIntoCache();
    } catch (Exception e) {
      e.printStackTrace();
    }
  }

  @Scheduled(fixedDelay = 60000, fixedRate = 60000)
  @Transactional
  void saveToDatabase() {
    try {
      updateGame(this.game);
    } catch (Exception e) {
      log.error(e.getMessage());
      e.printStackTrace();
    }
  }

  private GameEntity createGame() {
    GameEntity result = gameRepository.save(new GameEntity());
    RoundEntity round = roundService.create(1);
    ChatEntity chat = chatService.create(1);

    result.setCurrentRound(round);

    return gameRepository.save(result);
  }

  private GameEntity updateGame(GameEntity game) {
    roundService.save(List.of(game.getCurrentRound()));

    return game;
  }

  /**
   * Adding an event and routing it to the specific Service to handle that event
   *
   * @param account The account that the event is about
   * @param event   the event
   */
  public void addEvent(AccountEntity account, Event event) {
    if (!account.getId().equals(event.getAccountId())) {
      event.setAccountId(account.getId());
    }

    switch (event.getEventType()) {
      case BUY_BIAS, BUY_MULTI, PROMOTE, THROW_VINEGAR, BUY_AUTO_PROMOTE -> {
        RankerEntity highestActiveRanker = rankerService.findHighestActiveRankerOfAccount(account);
        ladderService.addEvent(highestActiveRanker.getLadder().getNumber(), event);
      }
      default -> roundService.handleGlobalEvent(event);
    }
  }
}
