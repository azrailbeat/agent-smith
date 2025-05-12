package kz.gov.agentsmith.api;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Agent Smith API клиент для Java
 * Позволяет отправлять запросы к API Agent Smith для создания обращений граждан
 * и получения статусов их обработки
 * 
 * @version 1.0.0
 */
public class AgentSmithApiClient {
    
    private static final String API_URL = "https://agent-smith.replit.app";
    private final String apiKey;
    
    /**
     * Конструктор клиента API
     * 
     * @param apiKey Ключ API для авторизации запросов
     */
    public AgentSmithApiClient(String apiKey) {
        this.apiKey = apiKey;
    }
    
    /**
     * Создать новое обращение гражданина
     * 
     * @param fullName ФИО заявителя
     * @param email Email заявителя
     * @param requestType Тип обращения
     * @param description Текст обращения
     * @param additionalFields Дополнительные поля обращения
     * @return ID созданного обращения или null в случае ошибки
     * @throws IOException если произошла ошибка при отправке запроса
     */
    public String createCitizenRequest(
            String fullName, 
            String email, 
            String requestType, 
            String description, 
            Map<String, String> additionalFields) throws IOException {
        
        Map<String, Object> requestData = new HashMap<>();
        requestData.put("fullName", fullName);
        requestData.put("contactInfo", email);
        requestData.put("requestType", requestType);
        requestData.put("description", description);
        
        if (additionalFields != null) {
            for (Map.Entry<String, String> entry : additionalFields.entrySet()) {
                // Добавляем дополнительные поля, исключая потенциальное перезаписывание основных полей
                if (!requestData.containsKey(entry.getKey())) {
                    requestData.put(entry.getKey(), entry.getValue());
                }
            }
        }
        
        // Генерируем уникальный ID для отслеживания запроса
        String externalId = "EXT-" + UUID.randomUUID().toString().substring(0, 8);
        requestData.put("externalId", externalId);
        requestData.put("sourceSystem", "java-api-client");
        
        // Отправляем запрос
        String response = sendPostRequest("/api/external/citizen-requests", requestData);
        
        // Обрабатываем ответ
        if (response != null && response.contains("\"success\":true")) {
            // Примечание: для корректного парсинга JSON рекомендуется использовать JSON библиотеку
            // Например: Jackson, Gson или org.json
            // Здесь используем простой парсинг для демонстрации
            int idStart = response.indexOf("\"id\":") + 5;
            int idEnd = response.indexOf(",", idStart);
            if (idEnd == -1) idEnd = response.indexOf("}", idStart);
            
            if (idStart > 5 && idEnd > idStart) {
                String id = response.substring(idStart, idEnd).trim();
                return id.replace("\"", ""); // Убираем кавычки, если ID строковый
            }
        }
        
        return null;
    }
    
    /**
     * Получить статус обращения по ID
     * 
     * @param requestId ID обращения
     * @return Статус обращения или null в случае ошибки
     * @throws IOException если произошла ошибка при отправке запроса
     */
    public String getRequestStatus(String requestId) throws IOException {
        String response = sendGetRequest("/api/external/citizen-requests/" + requestId);
        
        if (response != null && !response.contains("\"error\":")) {
            // Простой парсинг для демонстрации
            int statusStart = response.indexOf("\"status\":") + 10;
            int statusEnd = response.indexOf(",", statusStart);
            if (statusEnd == -1) statusEnd = response.indexOf("}", statusStart);
            
            if (statusStart > 10 && statusEnd > statusStart) {
                String status = response.substring(statusStart, statusEnd).trim();
                return status.replace("\"", ""); // Убираем кавычки, если статус строковый
            }
        }
        
        return null;
    }
    
    /**
     * Получить подробную информацию об обращении
     * 
     * @param requestId ID обращения
     * @return JSON строка с информацией об обращении или null в случае ошибки
     * @throws IOException если произошла ошибка при отправке запроса
     */
    public String getRequestDetails(String requestId) throws IOException {
        return sendGetRequest("/api/external/citizen-requests/" + requestId);
    }
    
    /**
     * Отправить комментарий к обращению
     * 
     * @param requestId ID обращения
     * @param comment Текст комментария
     * @return true если комментарий успешно добавлен
     * @throws IOException если произошла ошибка при отправке запроса
     */
    public boolean addComment(String requestId, String comment) throws IOException {
        Map<String, Object> commentData = new HashMap<>();
        commentData.put("requestId", requestId);
        commentData.put("comment", comment);
        commentData.put("source", "java-api-client");
        
        String response = sendPostRequest("/api/external/citizen-requests/" + requestId + "/comments", commentData);
        
        return response != null && response.contains("\"success\":true");
    }
    
    /**
     * Получить список обращений с возможностью фильтрации
     * 
     * @param status Фильтр по статусу (может быть null)
     * @param limit Максимальное количество результатов
     * @param offset Смещение для пагинации
     * @return JSON строка со списком обращений или null в случае ошибки
     * @throws IOException если произошла ошибка при отправке запроса
     */
    public String getRequestsList(String status, int limit, int offset) throws IOException {
        StringBuilder urlBuilder = new StringBuilder("/api/external/citizen-requests?limit=");
        urlBuilder.append(limit).append("&offset=").append(offset);
        
        if (status != null && !status.isEmpty()) {
            urlBuilder.append("&status=").append(status);
        }
        
        return sendGetRequest(urlBuilder.toString());
    }
    
    /**
     * Отправить POST запрос к API
     * 
     * @param endpoint Конечная точка API
     * @param data Данные для отправки
     * @return Ответ сервера или null в случае ошибки
     * @throws IOException если произошла ошибка при отправке запроса
     */
    private String sendPostRequest(String endpoint, Map<String, Object> data) throws IOException {
        URL url = new URL(API_URL + endpoint);
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        
        try {
            connection.setRequestMethod("POST");
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setRequestProperty("X-API-Key", apiKey);
            connection.setDoOutput(true);
            
            // Преобразуем Map в JSON строку
            String jsonData = mapToJson(data);
            
            // Отправляем данные
            try (OutputStream os = connection.getOutputStream()) {
                byte[] input = jsonData.getBytes(StandardCharsets.UTF_8);
                os.write(input, 0, input.length);
            }
            
            // Получаем ответ
            int responseCode = connection.getResponseCode();
            
            if (responseCode == HttpURLConnection.HTTP_OK || 
                responseCode == HttpURLConnection.HTTP_CREATED) {
                
                try (BufferedReader br = new BufferedReader(
                        new InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8))) {
                    
                    StringBuilder response = new StringBuilder();
                    String responseLine;
                    while ((responseLine = br.readLine()) != null) {
                        response.append(responseLine.trim());
                    }
                    return response.toString();
                }
            } else {
                try (BufferedReader br = new BufferedReader(
                        new InputStreamReader(connection.getErrorStream(), StandardCharsets.UTF_8))) {
                    
                    StringBuilder error = new StringBuilder();
                    String errorLine;
                    while ((errorLine = br.readLine()) != null) {
                        error.append(errorLine.trim());
                    }
                    System.err.println("Ошибка API: " + error);
                }
                return null;
            }
        } finally {
            connection.disconnect();
        }
    }
    
    /**
     * Отправить GET запрос к API
     * 
     * @param endpoint Конечная точка API
     * @return Ответ сервера или null в случае ошибки
     * @throws IOException если произошла ошибка при отправке запроса
     */
    private String sendGetRequest(String endpoint) throws IOException {
        URL url = new URL(API_URL + endpoint);
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        
        try {
            connection.setRequestMethod("GET");
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setRequestProperty("X-API-Key", apiKey);
            
            // Получаем ответ
            int responseCode = connection.getResponseCode();
            
            if (responseCode == HttpURLConnection.HTTP_OK) {
                try (BufferedReader br = new BufferedReader(
                        new InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8))) {
                    
                    StringBuilder response = new StringBuilder();
                    String responseLine;
                    while ((responseLine = br.readLine()) != null) {
                        response.append(responseLine.trim());
                    }
                    return response.toString();
                }
            } else {
                try (BufferedReader br = new BufferedReader(
                        new InputStreamReader(connection.getErrorStream(), StandardCharsets.UTF_8))) {
                    
                    StringBuilder error = new StringBuilder();
                    String errorLine;
                    while ((errorLine = br.readLine()) != null) {
                        error.append(errorLine.trim());
                    }
                    System.err.println("Ошибка API: " + error);
                }
                return null;
            }
        } finally {
            connection.disconnect();
        }
    }
    
    /**
     * Примитивное преобразование Map в JSON строку
     * В реальном проекте рекомендуется использовать библиотеку JSON
     * 
     * @param map Map для преобразования
     * @return JSON строка
     */
    private String mapToJson(Map<String, Object> map) {
        StringBuilder json = new StringBuilder("{");
        boolean first = true;
        
        for (Map.Entry<String, Object> entry : map.entrySet()) {
            if (!first) {
                json.append(",");
            }
            first = false;
            
            json.append("\"").append(entry.getKey()).append("\":");
            
            Object value = entry.getValue();
            if (value instanceof String) {
                json.append("\"").append(value.toString().replace("\"", "\\\"")).append("\"");
            } else if (value instanceof Integer || value instanceof Long || value instanceof Boolean) {
                json.append(value.toString());
            } else if (value == null) {
                json.append("null");
            } else {
                json.append("\"").append(value.toString().replace("\"", "\\\"")).append("\"");
            }
        }
        
        json.append("}");
        return json.toString();
    }
    
    /**
     * Пример использования API клиента
     */
    public static void main(String[] args) {
        try {
            // Создаем клиент с вашим API ключом
            AgentSmithApiClient client = new AgentSmithApiClient("ваш_api_ключ");
            
            // Создаем новое обращение
            Map<String, String> additionalFields = new HashMap<>();
            additionalFields.put("priority", "high");
            additionalFields.put("department", "IT отдел");
            
            String requestId = client.createCitizenRequest(
                "Иванов Иван Иванович", 
                "ivanov@example.com", 
                "Запрос информации", 
                "Прошу предоставить справку о составе семьи", 
                additionalFields
            );
            
            if (requestId != null) {
                System.out.println("Создано обращение с ID: " + requestId);
                
                // Получаем статус обращения
                String status = client.getRequestStatus(requestId);
                System.out.println("Статус обращения: " + status);
                
                // Добавляем комментарий к обращению
                boolean commentAdded = client.addComment(requestId, "Дополнительная информация по запросу");
                System.out.println("Комментарий добавлен: " + commentAdded);
                
                // Получаем подробную информацию об обращении
                String details = client.getRequestDetails(requestId);
                System.out.println("Детали обращения: " + details);
            } else {
                System.err.println("Не удалось создать обращение");
            }
            
            // Получаем список обращений со статусом "new"
            String requests = client.getRequestsList("new", 10, 0);
            System.out.println("Список новых обращений: " + requests);
            
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}