import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable } from 'react-beautiful-dnd';
import List from './List';
import AddListButton from './AddListButton';
import useSocket from '../../../../shared/hooks/useSocket';
import projectApiService from '../../services/projectApiService';
import { handleApiError } from '../../utils/errorHandler';
import { SUCCESS_MESSAGES } from '../../constants/projectConstants';

const Board = ({ projectId, boardId, initialData, onUpdate }) => {
  const board = initialData;
  const [lists, setLists] = useState(initialData?.lists || []);
  const socket = useSocket();

  useEffect(() => {
    setLists(initialData?.lists || []);
  }, [initialData]);

  useEffect(() => {
    if (!socket) return;

    // Listen for real-time updates
    const handleCardMove = (data) => {
      if (data.boardId === boardId) {
        setLists(prevLists => {
          const hasSource = prevLists.some(list => list._id === data.sourceListId);
          const hasDest = prevLists.some(list => list._id === data.destinationListId);
          if (!hasSource || !hasDest) return prevLists;

          return prevLists.map(list => {
            if (list._id === data.sourceListId) {
              return { ...list, cards: list.cards.filter(card => card._id !== data.cardId) };
            }
            if (list._id === data.destinationListId) {
              return { ...list, cards: [...list.cards, data.card] };
            }
            return list;
          });
        });
      }
    };

    const handleCardUpdate = (data) => {
      if (data.boardId === boardId) {
        setLists(prevLists => prevLists.map(list => {
          if (list._id !== data.listId) return list;
          const cardIndex = list.cards.findIndex(card => card._id === data.cardId);
          if (cardIndex === -1) return list;
          const newCards = [...list.cards];
          newCards[cardIndex] = { ...newCards[cardIndex], ...data.updates };
          return { ...list, cards: newCards };
        }));
      }
    };

    const handleNewCard = (data) => {
      if (data.boardId === boardId) {
        setLists(prevLists => prevLists.map(list =>
          list._id === data.listId ? { ...list, cards: [...list.cards, data.card] } : list
        ));
      }
    };

    socket.on('card:moved', handleCardMove);
    socket.on('card:updated', handleCardUpdate);
    socket.on('card:created', handleNewCard);

    return () => {
      socket.off('card:moved', handleCardMove);
      socket.off('card:updated', handleCardUpdate);
      socket.off('card:created', handleNewCard);
    };
  }, [socket, boardId]);

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const sourceList = lists.find(list => list._id === source.droppableId);
    const destList = lists.find(list => list._id === destination.droppableId);
    const card = sourceList.cards.find(card => card._id === draggableId);

    if (!sourceList || !destList || !card) return;

    // Optimistic update
    setLists(prevLists => {
      const sourceListIndex = prevLists.findIndex(list => list._id === source.droppableId);
      const destListIndex = prevLists.findIndex(list => list._id === destination.droppableId);
      if (sourceListIndex === -1 || destListIndex === -1) return prevLists;

      // Remove card from source list
      const newLists = prevLists.map((list, idx) =>
        idx === sourceListIndex
          ? { ...list, cards: list.cards.filter(c => c._id !== draggableId) }
          : list
      );

      // Add card to destination list (same list ref if source === destination)
      const updatedCard = { ...card, listId: destination.droppableId };
      const destCards = [...newLists[destListIndex].cards];
      destCards.splice(destination.index, 0, updatedCard);
      newLists[destListIndex] = { ...newLists[destListIndex], cards: destCards };

      return newLists;
    });

    try {
      // Update card position via API
      const response = await projectApiService.updateCard(draggableId, {
        listId: destination.droppableId,
        position: destination.index
      });

      if (response.success) {
        // Emit real-time update
        if (socket) {
          socket.emit('card:moved', {
            cardId: draggableId,
            boardId,
            sourceListId: source.droppableId,
            destinationListId: destination.droppableId,
            card: { ...card, listId: destination.droppableId }
          });
        }
      } else {
        throw new Error(response.message || 'Failed to move card');
      }
    } catch (error) {
      handleApiError(error, 'Failed to move card', { showToast: false });
      // Revert optimistic update
      setLists(initialData?.lists || []);
    }
  };

  const handleListUpdate = (listId, updates) => {
    setLists(prevLists => {
      const newLists = [...prevLists];
      const listIndex = newLists.findIndex(list => list._id === listId);
      
      if (listIndex !== -1) {
        newLists[listIndex] = { ...newLists[listIndex], ...updates };
      }
      
      return newLists;
    });
  };

  const handleCardUpdate = (listId, cardId, updates) => {
    setLists(prevLists => prevLists.map(list => {
      if (list._id !== listId) return list;
      const cardIndex = list.cards.findIndex(card => card._id === cardId);
      if (cardIndex === -1) return list;
      const newCards = [...list.cards];
      newCards[cardIndex] = { ...newCards[cardIndex], ...updates };
      return { ...list, cards: newCards };
    }));
  };

  if (!board) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading board...</div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50 p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{board.name}</h1>
        {board.description && (
          <p className="text-gray-600 mt-1">{board.description}</p>
        )}
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex space-x-4 overflow-x-auto pb-4">
          {lists.map((list) => (
            <List
              key={list._id}
              list={list}
              onUpdate={handleListUpdate}
              onCardUpdate={handleCardUpdate}
              projectId={projectId}
              boardId={boardId}
            />
          ))}
          
          <AddListButton
            boardId={boardId}
            onListAdded={(newList) => {
              setLists(prevLists => [...prevLists, newList]);
            }}
          />
        </div>
      </DragDropContext>
    </div>
  );
};

export default Board;
