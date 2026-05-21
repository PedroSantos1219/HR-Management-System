<?php

declare(strict_types=1);

// SMTP minimalista — STARTTLS (587), SSL directo (465) ou TCP.
class Mailer
{
    private string $host;
    private int    $port;
    private string $security;
    private string $username;
    private string $password;
    private string $fromEmail;
    private string $fromName;

    public function __construct(array $config)
    {
        $this->host      = (string)($config['host']      ?? '');
        $this->port      = (int)   ($config['port']      ?? 587);
        $this->security  = strtolower((string)($config['security'] ?? 'tls'));
        $this->username  = (string)($config['username']  ?? '');
        $this->password  = (string)($config['password']  ?? '');
        $this->fromEmail = (string)($config['from']      ?? $this->username);
        $this->fromName  = (string)($config['from_name'] ?? $this->fromEmail);
    }

    public function send(string $toEmail, string $toName, string $subject, string $html): void
    {
        $sock = $this->connect();
        try {
            $this->read($sock);
            $this->cmd($sock, 'EHLO localhost');
            $this->read($sock);

            if ($this->security === 'tls') {
                $this->cmd($sock, 'STARTTLS');
                $this->read($sock);
                if (!stream_socket_enable_crypto($sock, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                    throw new \RuntimeException('SMTP: STARTTLS falhou — verifique host/porta em config.php');
                }
                // Após upgrade TLS, RFC obriga a repetir EHLO
                $this->cmd($sock, 'EHLO localhost');
                $this->read($sock);
            }

            $this->cmd($sock, 'AUTH LOGIN');
            $this->read($sock);
            $this->cmd($sock, base64_encode($this->username));
            $this->read($sock);
            $this->cmd($sock, base64_encode($this->password));
            $reply = $this->read($sock);
            if (!str_starts_with(trim($reply), '235')) {
                throw new \RuntimeException('SMTP: autenticação falhada — verifique username/password em config.php');
            }

            $this->sendMessage($sock, $toEmail, $toName, $subject, $html);
            $this->cmd($sock, 'QUIT');
        } finally {
            fclose($sock);
        }
    }

    private function connect()
    {
        $timeout = 15;
        $errno = 0; $errstr = '';

        if ($this->security === 'ssl') {
            $ctx = stream_context_create(['ssl' => ['verify_peer' => true, 'verify_peer_name' => true]]);
            $sock = stream_socket_client(
                'ssl://' . $this->host . ':' . $this->port,
                $errno, $errstr, $timeout, STREAM_CLIENT_CONNECT, $ctx
            );
        } else {
            $sock = stream_socket_client(
                'tcp://' . $this->host . ':' . $this->port,
                $errno, $errstr, $timeout
            );
        }

        if (!$sock) {
            throw new \RuntimeException("SMTP: ligação falhou em {$this->host}:{$this->port} — {$errstr} ({$errno})");
        }
        stream_set_timeout($sock, $timeout);
        return $sock;
    }

    private function sendMessage($sock, string $toEmail, string $toName, string $subject, string $html): void
    {
        $boundary = bin2hex(random_bytes(8));
        $plain    = strip_tags($html);

        $headers  = 'Date: '              . date('r') . "\r\n";
        $headers .= 'From: =?UTF-8?B?'    . base64_encode($this->fromName) . '?= <' . $this->fromEmail . ">\r\n";
        $headers .= 'To: =?UTF-8?B?'      . base64_encode($toName)         . '?= <' . $toEmail         . ">\r\n";
        $headers .= 'Subject: =?UTF-8?B?' . base64_encode($subject)        . "?=\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: multipart/alternative; boundary=\"{$boundary}\"\r\n";

        $body  = "--{$boundary}\r\n";
        $body .= "Content-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n";
        $body .= chunk_split(base64_encode($plain));
        $body .= "--{$boundary}\r\n";
        $body .= "Content-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n";
        $body .= chunk_split(base64_encode($html));
        $body .= "--{$boundary}--\r\n";

        $this->cmd($sock, "MAIL FROM: <{$this->fromEmail}>"); $this->read($sock);
        $this->cmd($sock, "RCPT TO: <{$toEmail}>");           $this->read($sock);
        $this->cmd($sock, 'DATA');                            $this->read($sock);

        fwrite($sock, $headers . "\r\n" . $body . "\r\n.\r\n");
        $reply = $this->read($sock);
        if (!str_starts_with(trim($reply), '250')) {
            throw new \RuntimeException("SMTP: servidor rejeitou a mensagem — {$reply}");
        }
    }

    private function cmd($sock, string $line): void
    {
        fwrite($sock, $line . "\r\n");
    }

    private function read($sock): string
    {
        $buffer = '';
        while ($line = fgets($sock, 1024)) {
            $buffer .= $line;
            // Resposta SMTP terminada quando o 4º char é espaço (multi-linha usa '-')
            if (strlen($line) >= 4 && $line[3] === ' ') break;
        }
        return $buffer;
    }
}
