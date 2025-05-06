"""UI widgets for the programmable matter simulation."""
import pygame
from ui.config import *

class Widget:
    """Base class for UI widgets."""
    
    def __init__(self, x, y, width, height):
        """Initialize the widget with position and size."""
        self.rect = pygame.Rect(x, y, width, height)
        self.active = False
    
    def handle_event(self, event):
        """Handle pygame events for the widget."""
        pass
    
    def draw(self, surface):
        """Draw the widget on the given surface."""
        pass


class Button(Widget):
    """Button widget for triggering actions."""
    
    def __init__(self, x, y, width, height, text, callback=None):
        """Initialize the button with text and callback."""
        super().__init__(x, y, width, height)
        self.text = text
        self.callback = callback
        self.hovered = False
        self.font = pygame.font.Font(None, 24)
    
    def handle_event(self, event):
        """Handle button events (hover, click)."""
        if event.type == pygame.MOUSEMOTION:
            self.hovered = self.rect.collidepoint(event.pos)
        
        elif event.type == pygame.MOUSEBUTTONDOWN:
            if self.rect.collidepoint(event.pos) and self.callback:
                self.callback()
    
    def draw(self, surface):
        """Draw the button with hover effects."""
        color = GRAY if self.hovered else DARK_GRAY
        border = RED if self.hovered else GRAY
        
        # Draw button background
        pygame.draw.rect(surface, color, self.rect)
        pygame.draw.rect(surface, border, self.rect, 2)
        
        # Draw button text
        text_surf = self.font.render(self.text, True, WHITE)
        text_rect = text_surf.get_rect(center=self.rect.center)
        surface.blit(text_surf, text_rect)


class Slider(Widget):
    """Slider widget for numeric input."""
    
    def __init__(self, x, y, width, height, min_val, max_val, value, callback=None):
        """Initialize the slider with range and callback."""
        super().__init__(x, y, width, height)
        self.min_val = min_val
        self.max_val = max_val
        self.value = value
        self.callback = callback
        self.dragging = False
        self.handle_radius = height // 2
        self.font = pygame.font.Font(None, 24)
        self.track_rect = pygame.Rect(
            x + self.handle_radius, 
            y + height // 2 - 2,
            width - 2 * self.handle_radius,
            4
        )
    
    def handle_event(self, event):
        """Handle slider events (drag)."""
        if event.type == pygame.MOUSEBUTTONDOWN:
            # Check if mouse is on handle
            handle_pos = self._get_handle_pos()
            handle_rect = pygame.Rect(
                handle_pos[0] - self.handle_radius,
                handle_pos[1] - self.handle_radius,
                self.handle_radius * 2,
                self.handle_radius * 2
            )
            
            if handle_rect.collidepoint(event.pos):
                self.dragging = True
        
        elif event.type == pygame.MOUSEBUTTONUP:
            self.dragging = False
            
        elif event.type == pygame.MOUSEMOTION and self.dragging:
            # Calculate new value based on mouse position
            pos_ratio = (event.pos[0] - self.track_rect.left) / self.track_rect.width
            pos_ratio = max(0, min(1, pos_ratio))
            self.value = self.min_val + pos_ratio * (self.max_val - self.min_val)
            
            # Call the callback with the new value
            if self.callback:
                self.callback(self.value)
    
    def _get_handle_pos(self):
        """Calculate the handle position based on the current value."""
        value_ratio = (self.value - self.min_val) / (self.max_val - self.min_val)
        x = self.track_rect.left + value_ratio * self.track_rect.width
        y = self.rect.centery
        return (x, y)
    
    def draw(self, surface):
        """Draw the slider with track and handle."""
        # Draw track
        pygame.draw.rect(surface, GRAY, self.track_rect)
        
        # Draw handle
        handle_pos = self._get_handle_pos()
        pygame.draw.circle(surface, WHITE, handle_pos, self.handle_radius)
        pygame.draw.circle(surface, GRAY, handle_pos, self.handle_radius, 2)
        
        # Draw value
        text_surf = self.font.render(f"{self.value:.1f}", True, WHITE)
        text_rect = text_surf.get_rect(
            midtop=(self.rect.centerx, self.rect.bottom + 5)
        )
        surface.blit(text_surf, text_rect)


class DropDown(Widget):
    """Dropdown widget for selecting from a list of options."""
    
    def __init__(self, x, y, width, height, options, callback=None):
        """Initialize the dropdown with options and callback."""
        super().__init__(x, y, width, height)
        self.options = options
        self.selected_index = 0
        self.callback = callback
        self.expanded = False
        self.hover_index = -1
        self.font = pygame.font.Font(None, 24)
        
        # Calculate rects for the options
        self.option_rects = []
        for i in range(len(options)):
            self.option_rects.append(
                pygame.Rect(x, y + height * (i + 1), width, height)
            )
    
    def handle_event(self, event):
        """Handle dropdown events (expand, select)."""
        if event.type == pygame.MOUSEBUTTONDOWN:
            # Check if main dropdown is clicked
            if self.rect.collidepoint(event.pos):
                self.expanded = not self.expanded
            
            # Check if an option is clicked when expanded
            elif self.expanded:
                for i, option_rect in enumerate(self.option_rects):
                    if option_rect.collidepoint(event.pos):
                        self.selected_index = i
                        self.expanded = False
                        if self.callback:
                            self.callback(self.options[i])
                        break
            else:
                # Click outside should collapse dropdown
                self.expanded = False
        
        elif event.type == pygame.MOUSEMOTION:
            # Update hover state
            self.hover_index = -1
            if self.expanded:
                for i, option_rect in enumerate(self.option_rects):
                    if option_rect.collidepoint(event.pos):
                        self.hover_index = i
                        break
    
    def draw(self, surface):
        """Draw the dropdown and its options when expanded."""
        # Draw main dropdown
        pygame.draw.rect(surface, DARK_GRAY, self.rect)
        pygame.draw.rect(surface, GRAY, self.rect, 2)
        
        # Draw selected option
        if 0 <= self.selected_index < len(self.options):
            text_surf = self.font.render(self.options[self.selected_index], True, WHITE)
            text_rect = text_surf.get_rect(midleft=(self.rect.left + 10, self.rect.centery))
            surface.blit(text_surf, text_rect)
        
        # Draw dropdown arrow
        arrow_points = [
            (self.rect.right - 20, self.rect.centery - 5),
            (self.rect.right - 10, self.rect.centery + 5),
            (self.rect.right - 30, self.rect.centery + 5)
        ]
        pygame.draw.polygon(surface, WHITE, arrow_points)
        
        # Draw options when expanded
        if self.expanded:
            for i, option_rect in enumerate(self.option_rects):
                # Only draw visible options
                if option_rect.top < SCREEN_HEIGHT:
                    color = GRAY if i == self.hover_index else DARK_GRAY
                    pygame.draw.rect(surface, color, option_rect)
                    pygame.draw.rect(surface, GRAY, option_rect, 1)
                    
                    text_surf = self.font.render(self.options[i], True, WHITE)
                    text_rect = text_surf.get_rect(midleft=(option_rect.left + 10, option_rect.centery))
                    surface.blit(text_surf, text_rect)


class Label(Widget):
    """Label widget for displaying text."""
    
    def __init__(self, text, x, y, color=WHITE, font_size=24):
        """Initialize the label with text and appearance."""
        self.text = text
        self.x = x
        self.y = y
        self.color = color
        self.font = pygame.font.Font(None, font_size)
        
        # Calculate size based on text
        text_surf = self.font.render(text, True, color)
        width, height = text_surf.get_size()
        super().__init__(x, y, width, height)
    
    def draw(self, surface):
        """Draw the label text."""
        text_surf = self.font.render(self.text, True, self.color)
        surface.blit(text_surf, (self.x, self.y)) 